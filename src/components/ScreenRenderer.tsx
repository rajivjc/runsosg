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

/**
 * Parse Strava activity description for hashtag-based mapping
 * Returns: { athleteTag, cues, feel, confidence,

 parseNote }
 */
function parseStravaDescription(description: string = '') {
  const result: any = {
    athleteTag: null,
    cues: null,
    feel: null,
    confidence: 'none',
    parseNote: null
  };

  // Extract athlete hashtag (e.g., #daniel, #sarah)
  const athleteMatch = description.match(/#([a-zA-Z]+)(?:\s|$)/);
  if (athleteMatch) {
    result.athleteTag = athleteMatch[1].toLowerCase();
    result.confidence = 'high';
  }

  // Extract cues (e.g., #cues:steady breathing, lamp posts)
  const cuesMatch = description.match(/#cues:([^#\n]+)/);
  if (cuesMatch) {
    result.cues = cuesMatch[1].trim();
  }

  // Extract feel (e.g., #feel:good, #feel:tired)
  const feelMatch = description.match(/#feel:([a-zA-Z]+)/);
  if (feelMatch) {
    result.feel = feelMatch[1].toLowerCase();
  }

  // Set parse note
  if (!result.athleteTag) {
    result.parseNote = '⚠️ No athlete tag found - manual assignment needed';
    result.confidence = 'none';
  } else if (result.cues || result.feel) {
    result.parseNote = `✓ Mapped to ${result.athleteTag} with coaching metadata`;
    result.confidence = 'high';
  } else {
    result.parseNote = `✓ Mapped to ${result.athleteTag}`;
    result.confidence = 'medium';
  }

  return result;
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
        if (tpl.type === 'note') {
          tpl.body = `Went well: ${store.getByPath('form.went_well') || '(from form)'}. Hard: ${store.getByPath('form.was_hard') || '(from form)'}. Next: ${store.getByPath('form.next_time') || '(from form)'}.`;
        }
        if (tpl.type === 'session' && tpl.source === 'MANUAL') {
          const distance = store.getByPath('form.distance_km') || '0';
          const time = store.getByPath('form.moving_minutes') || '0';
          const pace = store.getByPath('form.pace_min_per_km') || (parseFloat(time) / parseFloat(distance)).toFixed(1);
          const hr = store.getByPath('form.avg_heart_rate');
          const feel = store.getByPath('form.athlete_feel') || 'OK 😐';
          const feelNotes = store.getByPath('form.athlete_feel_notes');
          const cues = store.getByPath('form.cues_used');
          const coachNotes = store.getByPath('form.coach_notes') || '';
          const effort = store.getByPath('form.effort') || 'Moderate';
          
          tpl.subtitle = `${distance} km • ${time} min • Pace: ${pace} min/km${hr ? ` • HR: ${hr} bpm` : ''}`;
          tpl.body = `**Feel:** ${feel}${feelNotes ? ` - ${feelNotes}` : ''}\n**Effort:** ${effort}${cues ? `\n**Cues used:** ${cues}` : ''}\n**Coach notes:** ${coachNotes}`;
        }
        store.mutateMock(action.target, action.operation, tpl);
      }
    }

    if (action.type === 'autoSyncStrava') {
      // Enhanced Strava auto-sync with hashtag-based parsing
      const candidates = store.getByPath('mockData.stravaCandidates') || [];
      const selectedAthleteName = store.getByPath('mockData.selectedAthlete.name') || '';
      
      if (candidates.length > 0 && store.getByPath('state.strava.accessTokenPresent')) {
        // Parse each candidate and match to current athlete
        const timelineEvents = candidates
          .map((c: any) => {
            const parsed = parseStravaDescription(c.description);
            
            // Match by athlete tag (case-insensitive)
            const athleteNameMatch = selectedAthleteName.toLowerCase() === parsed.athleteTag;
            
            if (!athleteNameMatch && !parsed.athleteTag) {
              // No tag - skip auto-import (would need manual assignment)
              return null;
            }
            
            if (!athleteNameMatch) {
              // Tagged for different athlete - skip
              return null;
            }
            
            // Calculate pace
            const pace = (c.movingMin / c.distanceKm).toFixed(1);
            
            // Build subtitle with available data
            let subtitle = `${c.distanceKm} km • ${c.movingMin} min • Pace: ${pace} min/km`;
            if (c.hr) subtitle += ` • HR: ${c.hr} bpm`;
            
            // Build body with parsed metadata
            let body = `Auto-imported from Strava (${c.name}).\n${parsed.parseNote}`;
            if (parsed.feel) body += `\n**Feel:** ${parsed.feel}`;
            if (parsed.cues) body += `\n**Cues used:** ${parsed.cues}`;
            
            return {
              type: 'session',
              source: 'STRAVA',
              icon: '🏃',
              title: 'Session',
              subtitle,
              body,
              date: c.date,
              id: `strava-${c.id}`,
              parseConfidence: parsed.confidence
            };
          })
          .filter(Boolean); // Remove nulls
        
        if (timelineEvents.length > 0) {
          store.mutateMock('mockData.selectedAthlete.timeline', 'prependMany', timelineEvents);
          store.setByPath('state.strava.lastImportAt', new Date().toISOString());
        }
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

  if ((screen as any).layout?.type === 'centered') {
    const subtitleMap: Record<string, string> = {
      login: 'Welcome back — sign in to continue',
      register: 'Create your account to get started',
    };
    const subtitle = subtitleMap[screen.id] || '';

    // Separate form fields from footer links
    const formComponents = screen.components.filter((c: any) => c.type !== 'link');
    const linkComponents = screen.components.filter((c: any) => c.type === 'link');

    return (
      <div data-testid={`screen-${screen.id}`} className="auth-outer">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-title">{screen.title}</h1>
            {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          </div>
          <div className="auth-form">
            {formComponents.map((c: any) => (
              <ComponentRenderer key={c.id} component={c} ctx={ctxBase} />
            ))}
          </div>
          {linkComponents.length > 0 && (
            <div className="auth-footer">
              {linkComponents.map((c: any) => (
                <ComponentRenderer key={c.id} component={c} ctx={ctxBase} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

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

  // Loading skeleton component
  if (component.type === 'loadingSkeleton') {
    const count = component.props?.count || 3;
    return (
      <div data-testid={`loading-${id}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton-list-item">
            <div className="loading-skeleton skeleton-text" style={{ width: '60%' }}></div>
            <div className="loading-skeleton skeleton-text" style={{ width: '40%' }}></div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state component
  if (component.type === 'emptyState') {
    return (
      <div className="empty-state" data-testid={`empty-${id}`}>
        <div className="empty-state-icon">{component.props?.icon || '📭'}</div>
        <h3 className="empty-state-title">{component.props?.title || 'No data'}</h3>
        <p className="empty-state-message">{component.props?.message || 'Try adjusting your search or filters'}</p>
        {component.props?.ctaLabel && (
          <button className="empty-state-cta" onClick={() => run(component.actions || [])}>
            {component.props.ctaLabel}
          </button>
        )}
      </div>
    );
  }

  // Error state component
  if (component.type === 'errorBanner') {
    return (
      <div className="error-banner" role="alert" data-testid={`error-${id}`}>
        <div className="error-banner-icon">⚠️</div>
        <div className="error-banner-content">
          <h4 className="error-banner-title">{component.props?.title || 'Error'}</h4>
          <p className="error-banner-message">{component.props?.message || 'Something went wrong'}</p>
          {component.actions && component.actions.length > 0 && (
            <div className="error-banner-action">
              <button onClick={() => run(component.actions)} className="primary">
                {component.props?.retryLabel || 'Retry'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Success message component
  if (component.type === 'successMessage') {
    return (
      <div className="success-message" role="status" data-testid={`success-${id}`}>
        <div className="success-message-icon">✓</div>
        <p className="success-message-text">{component.props?.message || 'Success'}</p>
      </div>
    );
  }

  // Toast notification component
  if (component.type === 'toast') {
    return (
      <div className="toast" role="status" aria-live="polite" data-testid={`toast-${id}`}>
        <span className="toast-icon">{component.props?.icon || '✓'}</span>
        <div className="toast-content">{component.props?.message || 'Success'}</div>
        {component.props?.dismissible && (
          <button className="toast-close" onClick={() => {}} aria-label="Close notification">✕</button>
        )}
      </div>
    );
  }

  // Warning banner component
  if (component.type === 'warningBanner') {
    return (
      <div className="warning-banner" role="status" data-testid={`warning-${id}`}>
        <div className="warning-banner-icon">⚡</div>
        <p className="warning-banner-text">{component.props?.message || 'Warning'}</p>
      </div>
    );
  }


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
  if (component.type === 'header') {
    const title = store.getByPath(component.props.titleBinding) || 'Athlete Hub';
    return (
      <header className="page-header">
        <div className="page-header-left">
          <button
            className="icon-button"
            onClick={() => run([component.props.leftAction])}
            aria-label="Go back"
          >
            ←
          </button>
        </div>
        <div className="page-header-center">
          <h2 className="page-header-title">{title}</h2>
        </div>
        <div className="page-header-right">
          <button
            className="icon-button"
            onClick={() => run(component.actions)}
            aria-label="Settings"
          >
            {component.props.rightIcon}
          </button>
        </div>
      </header>
    );
  }
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

  if (component.type === 'button') {
    const variant = component.props?.variant ?? 'primary';
    const variantClass = variant === 'secondary' ? 'btn-secondary' : variant === 'ghost' ? 'btn-ghost' : variant === 'icon' ? 'btn-icon' : 'btn-primary';
    return <button data-testid={`btn-${id}`} className={variantClass} onClick={() => run(component.actions)}>{component.props?.label}</button>;
  }

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
      // Tab style - underline beneath each tab with keyboard navigation
      const handleKeyDown = (e: React.KeyboardEvent, tabIndex: number) => {
        const tabArray = isObjectOptions ? options.map((o: any) => o.value) : options;
        let newIndex = tabIndex;
        
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          newIndex = (tabIndex + 1) % tabArray.length;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          newIndex = (tabIndex - 1 + tabArray.length) % tabArray.length;
        } else if (e.key === 'Home') {
          e.preventDefault();
          newIndex = 0;
        } else if (e.key === 'End') {
          e.preventDefault();
          newIndex = tabArray.length - 1;
        } else {
          return;
        }
        
        const newValue = tabArray[newIndex];
        store.setByPath(component.props.stateBinding || '', newValue);
        run(component.actions, { value: newValue });
      };

      return (
        <div className="tab-container" role="tablist">
          {isObjectOptions ? (
            options.map((o: any, idx: number) => (
              <button 
                key={o.value}
                type="button"
                role="tab"
                aria-selected={value === o.value}
                className={`tab-button ${value === o.value ? 'active' : ''}`}
                onClick={() => {
                  store.setByPath(component.props.stateBinding || '', o.value);
                  run(component.actions, { value: o.value });
                }}
                onKeyDown={(e) => handleKeyDown(e, idx)}
              >
                {o.label}
              </button>
            ))
          ) : (
            options.map((o: string, idx: number) => (
              <button
                key={o}
                type="button"
                role="tab"
                aria-selected={value === o}
                className={`tab-button ${value === o ? 'active' : ''}`}
                onClick={() => {
                  store.setByPath(component.props.stateBinding || '', o);
                  run(component.actions, { value: o });
                }}
                onKeyDown={(e) => handleKeyDown(e, idx)}
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

  if (component.type === 'div') {
    const className = component.props?.className || '';
    const content = component.content ? interpolate(component.content, { ...ctx, item }) : null;
    return (
      <div className={className} data-testid={`div-${id}`}>
        {content && <span>{content}</span>}
        {component.components?.map((child: any) => <ComponentRenderer key={child.id} component={child} ctx={ctx} item={item} />)}
      </div>
    );
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
      if (component.props?.itemTemplate === 'athleteCard') {
        // Render athleteCard template as an interactive card
        const template = appSpec.templates.athleteCard;
        const statusBadge = it.status ? (
          <span className={`badge badge-${it.status.toLowerCase()}`}>{it.status}</span>
        ) : null;
        return (
          <button key={it.id} data-testid={`athlete-card-${it.id}`} onClick={() => run(component.actions, { item: it })} className="athlete-row-item">
            <div className="athlete-row">
              <div className="athlete-row-content">
                <div className="athlete-row-info">
                  <div className="athlete-name">{interpolate(template.components?.[0]?.components?.[0]?.content || template.title || '{{item.name}}', { ...ctx, item: it })}</div>
                  <div className="athlete-meta">{interpolate(template.components?.[0]?.components?.[1]?.content || template.meta || '{{item.lastActivityFormatted}} • {{item.sessionCount}} sessions', { ...ctx, item: it })}</div>
                </div>
                {statusBadge && <div className="athlete-status-badge">{statusBadge}</div>}
              </div>
            </div>
          </button>
        );
      }
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
      if (component.props?.itemTemplate === 'stravaCandidateCard') {
        // Render stravaCandidateCard as a clickable div
        const template = appSpec.templates.stravaCandidateCard;
        return (
          <div key={it.id} data-testid={`strava-candidate-${it.id}`} onClick={() => run(component.actions, { item: it })} className={`${template.className || 'strava-candidate-item'}`} style={{ cursor: 'pointer' }}>
            {template.components?.map((child: any) => (
              <ComponentRenderer key={child.id || it.id} component={child} ctx={{ ...ctx, item: it }} item={it} />
            ))}
          </div>
        );
      }
      return <article className="card" key={it.id}><strong>{interpolate(appSpec.templates.stravaCandidateCard.title || '{{item.name}}', { ...ctx, item: it })}</strong></article>;
    })}</div>;
  }

  return <div>Unsupported component {component.type}{index}</div>;
}

export function filterTimeline(items: any[], selected: string, map: Record<string, string>) {
  const target = map[selected];
  if (!target || target === '*') return items;
  return items.filter((i) => i.type === target);
}
