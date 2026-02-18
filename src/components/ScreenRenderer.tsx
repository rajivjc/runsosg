'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { appSpec } from '@/lib/spec';
import { interpolate } from '@/lib/interpolate';
import { buildPath } from '@/lib/path';
import { getValueByPath } from '@/lib/paths';
import { useAppStore } from '@/lib/store';

function isVisible(visibility: any, role: string) {
  if (!visibility?.roles) return true;
  return visibility.roles.includes(role);
}

export function runAction(action: any, ctx: any) {
  try {
    const { store, routeParams, router } = ctx;
    
    if (action.type === 'setState') {
      const path = action.path;
      const value = interpolate(action.value, ctx);
      store.setByPath(path, value);
    }
    
    if (action.type === 'navigate') {
      const params = Object.fromEntries(Object.entries(action.with || {}).map(([k, v]) => [k, interpolate(v, ctx)]));
      const path = buildPath(action.to, params);
      if (router) {
        router.push(path);
      }
    }
    
    if (action.type === 'conditionalNavigate') {
      const cond = !!store.getByPath(action.if);
      const params = Object.fromEntries(Object.entries(action.with || {}).map(([k, v]) => [k, interpolate(v, ctx)]));
      router.push(buildPath(cond ? action.to : action.elseTo, params as Record<string, string>));
    }
    
    if (action.type === 'selectAthleteByRouteParam') {
      const from = store.getByPath(action.from) || [];
      const id = routeParams[action.param];
      const selected = from.find((x: any) => x.id === id);
      if (selected) store.setByPath(action.target, selected);
    }
    
    if (action.type === 'mutateMock') {
      if (action.valueBinding) store.mutateMock(action.target, action.operation, store.getByPath(action.valueBinding));
      if (action.valueTemplate) {
        const tpl = structuredClone(store.getByPath(action.valueTemplate));
        if (tpl.type === 'note') tpl.body = `Went well: ${store.getByPath('form.went_well') || '(from form)'}. Hard: ${store.getByPath('form.was_hard') || '(from form)'}. Next: ${store.getByPath('form.next_time') || '(from form)'}.`;
        store.mutateMock(action.target, action.operation, tpl);
      }
    }

    if (action.type === 'autoSyncStrava') {
      // Simulate Strava auto-sync: find candidates with matching hashtag and auto-import them
      const hashtag = store.getByPath('state.strava.hashtag') || '#sosg';
      const candidates = store.getByPath('mockData.stravaCandidates') || [];
      const matching = candidates.filter((c: any) => c.tag === hashtag);
      
      if (matching.length > 0 && store.getByPath('state.strava.accessTokenPresent')) {
        // Convert matching candidates to timeline events and prepend
        const timelineEvents = matching.map((m: any) => ({
          type: 'session',
          source: 'STRAVA',
          icon: '🏃',
          title: 'Session',
          subtitle: `${m.distanceKm} km • ${m.movingMin} min • Effort: OK`,
          body: `Auto-imported from Strava (${m.name}).`,
          date: m.date,
          id: `strava-${m.id}`
        }));
        
        store.mutateMock('mockData.selectedAthlete.timeline', 'prependMany', timelineEvents);
        store.setByPath('state.strava.lastImportAt', new Date().toISOString());
      }
    }
  } catch (e) {
    console.error('[runAction-error]', e, action);
  }
}

export default function ScreenRenderer({ screenId, routeParams }: { screenId: string; routeParams: Record<string, string> }) {
  const screen = useMemo(() => appSpec.screens.find((s) => s.id === screenId), [screenId]);
  const router = useRouter();
  const store = useAppStore();

  useEffect(() => {
    store.initPersistence();
  }, []);

  useEffect(() => {
    if (store.state.authed === false && screenId !== 'login' && screenId !== 'register') {
      router.replace('/login');
    }
  }, [store.state.authed, screenId, router]);

  useEffect(() => {
    // Initialize detail tab when entering athlete detail screen
    if (screenId === 'athlete_detail' && !store.state.currentDetailTab) {
      store.setByPath('state.currentDetailTab', 'feed');
    }
    screen?.onEnter?.forEach((action) => runAction(action, { store, routeParams, route: routeParams, router }));
  }, [screen, routeParams, router]);

  // Initialize filtered athletes on athlete_list screen load
  useEffect(() => {
    if (screenId === 'athlete_list' && store.mockData.filteredAthletes.length === 0) {
      store.computeFilteredAthletes();
    }
  }, [screenId, store.mockData.filteredAthletes.length]);

  useEffect(() => {
    // Compute filtered athletes when search, sort, or page changes
    if (screenId === 'athlete_list') {
      store.computeFilteredAthletes();
    }
  }, [store.state.athleteListSearch, store.state.athleteListSort, store.state.athleteListPage, screenId]);

  if (!screen) return <div>Screen missing: {screenId}</div>;
  if (!isVisible(screen.visibility, store.state.role)) {
    return <div data-testid={`screen-${screen.id}`}><p>Access denied</p><Link href="/athlete_list">Go to athlete list</Link></div>;
  }

  const ctxBase = { store, routeParams, route: routeParams, state: store.state, data: null, router };

  return (
    <div data-testid={`screen-${screen.id}`}>
      {(screen as any).layout?.type !== 'centered' && <h1>{screen.title}</h1>}
      {screen.components.map((c) => {
        if (!isVisible(c.visibility, store.state.role)) return null;
        return <ComponentRenderer key={c.id} component={c} ctx={ctxBase} />;
      })}
    </div>
  );
}

function ComponentRenderer({ component, ctx, item, index }: any) {
  const store = ctx.store;
  const role = store.state.role;
  if (!isVisible(component.visibility, role)) return null;
  const run = (actions: any[] = [], extra: any = {}) => {
    const finalItem = extra.item ?? item;  // Use extra.item if provided, otherwise use component's item
    actions.forEach((a) => runAction(a, { ...ctx, ...extra, item: finalItem }));
  };
  const id = component.id;

  // Conditional render - show/hide based on condition
  if (component.type === 'conditionalRender') {
    const condition = interpolate(component.condition, { ...ctx, item });
    if (!condition) return null;
    return <>
      {component.components?.map((child: any) => (
        <ComponentRenderer key={child.id} component={child} ctx={ctx} item={item} />
      ))}
    </>;
  }

  // Modal overlay
  if (component.type === 'modalOverlay') {
    const closeActions = component.onClose || [];
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxHeight: '80vh', overflow: 'auto' }}>
          <div className="modal-header">
            <h3 style={{ margin: 0, flex: 1 }}>{component.props?.title}</h3>
            <button className="modal-close" onClick={() => run(closeActions)}>✕</button>
          </div>
          <div style={{ padding: 'var(--space-4)' }}>
            {component.components?.map((child: any) => (
              <ComponentRenderer key={child.id} component={child} ctx={ctx} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (component.type === 'text') return <p>{interpolate(component.props?.text, { ...ctx, item })}</p>;
  if (component.type === 'divider') return <hr />;
  if (component.type === 'image' || component.type === 'avatar') return <div className="card">{component.props?.alt || 'Avatar'}</div>;
  if (component.type === 'sectionTitle') return <h2>{component.props?.text}</h2>;
  if (component.type === 'searchBar') {
    return <input data-testid={`search-${id}`} placeholder={component.props?.placeholder} value={store.state.athleteListSearch || ''} onChange={(e) => {
      store.setByPath('state.athleteListSearch', e.target.value);
      store.setByPath('state.athleteListPage', 0);
    }} />;
  }
  if (component.type === 'header') return <div className="card"><button onClick={() => run([component.props.leftAction])}>Back</button><strong>{store.getByPath(component.props.titleBinding)}</strong><button onClick={() => run(component.actions)}>{component.props.rightIcon}</button></div>;
  if (component.type === 'kvList') {
    return (
      <dl>
        {component.props.items.map((kv: any) => {
          const displayValue = interpolate(kv.v, { ...ctx, data: ctx.data, item });
          return (
            <div key={kv.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <dt>{kv.k}</dt>
              <dd>{displayValue}</dd>
            </div>
          );
        })}
      </dl>
    );
  }
  if (component.type === 'toggle') return <label><input data-testid={`toggle-${id}`} type="checkbox" defaultChecked={component.props?.default} />{component.props?.label}</label>;

  if (component.type === 'button') return <button data-testid={`btn-${id}`} onClick={() => run(component.actions)}>{component.props?.label}</button>;

  if (component.type === 'link') return <a data-testid={`link-${id}`} onClick={() => run(component.actions)} style={{ cursor: 'pointer', color: 'var(--accent)', textDecoration: 'underline' }}>{component.props?.text}</a>;

  if (['textInput', 'passwordInput', 'numberInput', 'textArea', 'dateTimePicker', 'chipInput', 'emojiPicker'].includes(component.type)) {
    const Tag = component.type === 'textArea' ? 'textarea' : 'input';
    return <label>{component.props?.label}<Tag data-testid={`input-${id}`} type={component.type === 'passwordInput' ? 'password' : component.type === 'numberInput' ? 'number' : component.type === 'dateTimePicker' ? 'datetime-local' : 'text'} placeholder={component.props?.placeholder} onChange={(e: any) => store.setFormValue(id, e.target.value)} /></label>;
  }

  if (component.type === 'select') {
    // Handle both string array and object array options
    const options = component.props?.options || [];
    const isObjectOptions = options.length > 0 && typeof options[0] === 'object';
    
    return <label>
      {component.props?.label}
      <select 
        data-testid={`select-${id}`} 
        defaultValue={component.props?.default}
        onChange={(e) => {
          const value = e.target.value;
          store.setFormValue(id, value);
          run(component.actions, { value });
        }}
      >
        {isObjectOptions ? (
          options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)
        ) : (
          options.map((o: string) => <option key={o} value={o}>{o}</option>)
        )}
      </select>
    </label>;
  }

  if (component.type === 'segmentedControl') {
    const options = component.props?.options || [];
    const isObjectOptions = options.length > 0 && typeof options[0] === 'object';
    const currentValue = component.props?.stateBinding 
      ? store.getByPath(component.props.stateBinding) 
      : store.controls[id];
    const defaultValue = component.props?.default;
    const value = currentValue || defaultValue;

    // Determine if this is a tab group (larger, main navigation) or a small filter group
    const isTabs = component.props?.isTabs || component.id?.includes('tabs') || component.id?.includes('detail_tabs');

    if (isTabs) {
      // Tab style - underline beneath each tab
      return (
        <div className="tab-container">
          {isObjectOptions ? (
            options.map((o: any) => (
              <button 
                key={o.value}
                type="button"
                className={`tab-button ${value === o.value ? 'active' : ''}`}
                onClick={() => {
                  store.setByPath(component.props.stateBinding || '', o.value);
                  run(component.actions, { value: o.value });
                }}
              >
                {o.label}
              </button>
            ))
          ) : (
            options.map((o: string) => (
              <button
                key={o}
                type="button"
                className={`tab-button ${value === o ? 'active' : ''}`}
                onClick={() => {
                  store.setByPath(component.props.stateBinding || '', o);
                  run(component.actions, { value: o });
                }}
              >
                {o}
              </button>
            ))
          )}
        </div>
      );
    } else {
      // Segmented control style for filters
      return (
        <div className="segmented-group">
          {isObjectOptions ? (
            options.map((o: any) => (
              <button 
                key={o.value} 
                type="button"
                className={`segmented-button ${value === o.value ? 'active' : ''}`}
                onClick={() => {
                  store.setControl(id, o.value);
                  store.setByPath(component.props.stateBinding || '', o.value);
                  run(component.actions, { value: o.value });
                }}
              >
                {o.label}
              </button>
            ))
          ) : (
            options.map((o: string) => (
              <button 
                key={o} 
                type="button"
                className={`segmented-button ${value === o ? 'active' : ''}`}
                onClick={() => {
                  store.setControl(id, o);
                  store.setByPath(component.props.stateBinding || '', o);
                  run(component.actions, { value: o });
                }}
              >
                {o}
              </button>
            ))
          )}
        </div>
      );
    }
  }

  if (component.type === 'card') {
    const data = component.dataBinding ? store.getByPath(component.dataBinding) : null;
    return <section className="card" data-testid={`card-${id}`}><h3>{component.props?.title}</h3>{component.components?.map((child: any) => <ComponentRenderer key={child.id} component={child} ctx={{ ...ctx, data }} />)}{component.footerActions?.map((b: any) => <ComponentRenderer key={b.id} component={b} ctx={ctx} />)}</section>;
  }

  if (component.type === 'actionBar') return <div className="card">{component.components.map((child: any) => <ComponentRenderer key={child.id} component={child} ctx={ctx} />)}</div>;

  if (component.type === 'list') {
    let items = store.getByPath(component.dataBinding) || [];
    if (component.filterBinding) {
      // Handle both direct control value and state-based filter
      const controlId = component.filterBinding.controlId;
      const selected = store.controls[controlId] || store.getByPath(`state.${controlId}`) || component.filterBinding.default || 'all';
      const mapped = component.filterBinding.map[selected];
      if (mapped && mapped !== '*') items = items.filter((x: any) => x.type === mapped);
    }
    if (!items.length && component.emptyState) return <div data-testid={`list-${id}`}><strong>{component.emptyState.title}</strong><p>{component.emptyState.message}</p></div>;
    return <div data-testid={`list-${id}`} className={component.props?.className || ''}>{items.map((it: any, idx: number) => {
      if (component.props?.itemTemplate === 'athleteCard') return <button className="card" key={it.id} data-testid={`athlete-card-${it.id}`} onClick={() => run(component.actions, { item: it })}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}><strong>{interpolate(appSpec.templates.athleteCard.title, { ...ctx, item: it })}</strong>{it.status && <span className={`badge-${it.status}`}>{it.status}</span>}</div><span>{interpolate(appSpec.templates.athleteCard.subtitle, { ...ctx, item: it })}</span><span style={{ fontSize: 'var(--text-meta)', color: 'var(--text-secondary)' }}>{interpolate(appSpec.templates.athleteCard.meta, { ...ctx, item: it })}</span></button>;
      if (component.props?.itemTemplate === 'timelineCard') {
        const template = appSpec.templates.timelineCard;
        const badge = interpolate(template.badge, { ...ctx, item: it });
        return (
          <article className={`card ${template.className}`} key={it.id || idx} data-testid={`timeline-item-${idx}`} onClick={() => run(component.actions, { item: it })} style={{ cursor: 'pointer' }}>
            <strong>{interpolate(template.title, { ...ctx, item: it })}</strong>
            <p>{interpolate(template.subtitle, { ...ctx, item: it })}</p>
            <p>{interpolate(template.body, { ...ctx, item: it })}</p>
            {badge && <span className="feed-item-badge feed-item-badge-strava-sync">{badge}</span>}
            <span style={{ fontSize: 'var(--text-meta)', color: 'var(--text-secondary)' }}>{interpolate(template.rightContent, { ...ctx, item: it })}</span>
          </article>
        );
      }
      return <article className="card" key={it.id}><strong>{interpolate(appSpec.templates.stravaCandidateCard.title, { ...ctx, item: it })}</strong></article>;
    })}</div>;
  }

  return <div>Unsupported component {component.type}{index}</div>;
}

export function filterTimeline(items: any[], selected: string, map: Record<string, string>) {
  const target = map[selected];
  if (!target || target === '*') return items;
  return items.filter((i) => i.type === target);
}
