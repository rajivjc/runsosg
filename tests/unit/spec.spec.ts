import { appSpec } from '@/lib/spec';

describe('Spec Configuration Tests', () => {
  describe('App roles', () => {
    test('Unit-7 App has exactly 3 roles', () => {
      expect(appSpec.app.roles).toHaveLength(3);
    });

    test('Unit-8 App roles are CAREGIVER, COACH, ADMIN', () => {
      expect(appSpec.app.roles).toEqual(['CAREGIVER', 'COACH', 'ADMIN']);
    });

    test('Unit-9 Default role is COACH', () => {
      expect(appSpec.state.role).toBe('COACH');
    });
  });

  describe('Login screen', () => {
    const loginScreen = appSpec.screens.find((s: any) => s.id === 'login');

    test('Unit-10 Login screen exists', () => {
      expect(loginScreen).toBeDefined();
    });

    test('Unit-11 Login screen has no logo component', () => {
      const logoComponent = loginScreen?.components.find((c: any) => c.id === 'logo');
      expect(logoComponent).toBeUndefined();
    });

    test('Unit-12 Login screen has email and password inputs', () => {
      const emailInput = loginScreen?.components.find((c: any) => c.id === 'email');
      const passwordInput = loginScreen?.components.find((c: any) => c.id === 'password');
      expect(emailInput).toBeDefined();
      expect(passwordInput).toBeDefined();
    });

    test('Unit-13 Login role selector has 3 options', () => {
      const roleSelector = loginScreen?.components.find((c: any) => c.id === 'role_selector');
      expect(roleSelector?.props.options).toHaveLength(3);
    });

    test('Unit-14 Login role selector options are CAREGIVER, COACH, ADMIN', () => {
      const roleSelector = loginScreen?.components.find((c: any) => c.id === 'role_selector');
      expect(roleSelector?.props.options).toEqual(['CAREGIVER', 'COACH', 'ADMIN']);
    });

    test('Unit-15 Login role selector default is COACH', () => {
      const roleSelector = loginScreen?.components.find((c: any) => c.id === 'role_selector');
      expect(roleSelector?.props.default).toBe('COACH');
    });

    test('Unit-16 Login screen has register link', () => {
      const registerLink = loginScreen?.components.find((c: any) => c.id === 'link_register');
      expect(registerLink).toBeDefined();
      expect(registerLink?.props.text).toContain('Register');
    });

    test('Unit-17 Register link navigates to register screen', () => {
      const registerLink = loginScreen?.components.find((c: any) => c.id === 'link_register');
      expect(registerLink?.actions[0].to).toBe('register');
    });
  });

  describe('Register screen', () => {
    const registerScreen = appSpec.screens.find((s: any) => s.id === 'register');

    test('Unit-18 Register screen exists', () => {
      expect(registerScreen).toBeDefined();
    });

    test('Unit-19 Register screen route is /register', () => {
      expect(registerScreen?.route).toBe('register');
    });

    test('Unit-20 Register screen has email and password inputs', () => {
      const emailInput = registerScreen?.components.find((c: any) => c.id === 'email');
      const passwordInput = registerScreen?.components.find((c: any) => c.id === 'password');
      const confirmPassword = registerScreen?.components.find((c: any) => c.id === 'confirm_password');
      expect(emailInput).toBeDefined();
      expect(passwordInput).toBeDefined();
      expect(confirmPassword).toBeDefined();
    });

    test('Unit-21 Register role selector has 3 options', () => {
      const roleSelector = registerScreen?.components.find((c: any) => c.id === 'role_selector');
      expect(roleSelector?.props.options).toHaveLength(3);
    });

    test('Unit-22 Register role selector options are CAREGIVER, COACH, ADMIN', () => {
      const roleSelector = registerScreen?.components.find((c: any) => c.id === 'role_selector');
      expect(roleSelector?.props.options).toEqual(['CAREGIVER', 'COACH', 'ADMIN']);
    });

    test('Unit-23 Register role selector default is CAREGIVER', () => {
      const roleSelector = registerScreen?.components.find((c: any) => c.id === 'role_selector');
      expect(roleSelector?.props.default).toBe('CAREGIVER');
    });

    test('Unit-24 Register screen has login link', () => {
      const loginLink = registerScreen?.components.find((c: any) => c.id === 'link_login');
      expect(loginLink).toBeDefined();
      expect(loginLink?.props.text).toContain('Login');
    });

    test('Unit-25 Login link navigates to login screen', () => {
      const loginLink = registerScreen?.components.find((c: any) => c.id === 'link_login');
      expect(loginLink?.actions[0].to).toBe('login');
    });
  });

  describe('Role visibility constraints', () => {
    test('Unit-26 No screens or components use VOLUNTEER role', () => {
      const allText = JSON.stringify(appSpec);
      expect(allText).not.toContain('"VOLUNTEER"');
    });

    test('Unit-27 No screens or components use PARENT role', () => {
      const allText = JSON.stringify(appSpec);
      expect(allText).not.toContain('"PARENT"');
    });

    test('Unit-28 Add coach note screen has CAREGIVER role in visibility', () => {
      const addNoteScreen = appSpec.screens.find((s: any) => s.id === 'add_coach_note');
      expect(addNoteScreen?.visibility?.roles).toContain('CAREGIVER');
    });

    test('Unit-29 Edit cues screen has CAREGIVER role in visibility', () => {
      const editCuesScreen = appSpec.screens.find((s: any) => s.id === 'edit_cues');
      expect(editCuesScreen?.visibility?.roles).toContain('CAREGIVER');
    });

    test('Unit-30 Add session screen has CAREGIVER role in visibility', () => {
      const addSessionScreen = appSpec.screens.find((s: any) => s.id === 'add_session');
      expect(addSessionScreen?.visibility?.roles).toContain('CAREGIVER');
    });

    test('Unit-31 Edit cues button visibility has CAREGIVER role', () => {
      const timelineScreen = appSpec.screens.find((s: any) => s.id === 'athlete_timeline');
      const card = timelineScreen?.components.find((c: any) => c.id === 'card_cues_pinned');
      const editButton = card?.footerActions?.find((a: any) => a.id === 'btn_edit_cues');
      expect(editButton?.visibility?.roles).toContain('CAREGIVER');
      expect(editButton?.visibility?.roles).not.toContain('VOLUNTEER');
    });

    test('Unit-32 Add note button visibility has CAREGIVER role', () => {
      const timelineScreen = appSpec.screens.find((s: any) => s.id === 'athlete_timeline');
      const actionBar = timelineScreen?.components.find((c: any) => c.id === 'timeline_actions');
      const addNoteButton = actionBar?.components?.find((c: any) => c.id === 'btn_add_note');
      expect(addNoteButton?.visibility?.roles).toContain('CAREGIVER');
      expect(addNoteButton?.visibility?.roles).not.toContain('VOLUNTEER');
    });

    test('Unit-33 Add session button visibility has CAREGIVER role', () => {
      const timelineScreen = appSpec.screens.find((s: any) => s.id === 'athlete_timeline');
      const actionBar = timelineScreen?.components.find((c: any) => c.id === 'timeline_actions');
      const addSessionButton = actionBar?.components?.find((c: any) => c.id === 'btn_add_session');
      expect(addSessionButton?.visibility?.roles).toContain('CAREGIVER');
      expect(addSessionButton?.visibility?.roles).not.toContain('VOLUNTEER');
    });

    test('Unit-34 Import Strava button visibility has CAREGIVER role', () => {
      const timelineScreen = appSpec.screens.find((s: any) => s.id === 'athlete_timeline');
      const actionBar = timelineScreen?.components.find((c: any) => c.id === 'timeline_actions');
      
      // Find conditional render sections for Strava buttons
      const connectSection = actionBar?.components?.find((c: any) => c.id === 'strava_connect_section');
      const syncSection = actionBar?.components?.find((c: any) => c.id === 'strava_sync_section');
      
      // Check Connect Strava button
      const connectButton = connectSection?.components?.find((c: any) => c.id === 'btn_connect_strava');
      expect(connectButton?.visibility?.roles).toContain('CAREGIVER');
      expect(connectButton?.visibility?.roles).not.toContain('VOLUNTEER');
      
      // Check Sync now button
      const syncButton = syncSection?.components?.find((c: any) => c.id === 'btn_sync_strava');
      expect(syncButton?.visibility?.roles).toContain('CAREGIVER');
      expect(syncButton?.visibility?.roles).not.toContain('VOLUNTEER');
    });
  });

  describe('Athlete list page', () => {
    const athleteListScreen = appSpec.screens.find((s: any) => s.id === 'athlete_list');

    test('Unit-35 Athlete list screen exists', () => {
      expect(athleteListScreen).toBeDefined();
    });

    test('Unit-36 Athlete list has 30+ athletes', () => {
      expect(appSpec.mockData.athletes.length).toBeGreaterThanOrEqual(30);
    });

    test('Unit-37 Each athlete has required fields', () => {
      appSpec.mockData.athletes.forEach((a: any) => {
        expect(a.id).toBeDefined();
        expect(a.name).toBeDefined();
        expect(a.status).toBeDefined();
        expect(a.lastActivity).toBeDefined();
        expect(a.sessionCount).toBeDefined();
      });
    });

    test('Unit-38 Athlete status is active or inactive', () => {
      appSpec.mockData.athletes.forEach((a: any) => {
        expect(['active', 'inactive']).toContain(a.status);
      });
    });

    test('Unit-39 Athlete list has search bar component', () => {
      const searchBar = athleteListScreen?.components.find((c: any) => c.id === 'athlete_search');
      expect(searchBar).toBeDefined();
      expect(searchBar?.type).toBe('searchBar');
    });

    test('Unit-40 Athlete list has sort segmented control', () => {
      const sortContainer = athleteListScreen?.components.find((c: any) => c.id === 'sort_container');
      expect(sortContainer).toBeDefined();
      const sortControl = sortContainer?.components?.find((c: any) => c.id === 'athlete_sort');
      expect(sortControl).toBeDefined();
      expect(sortControl?.type).toBe('segmentedControl');
      expect(sortControl?.props.options).toContain('Name');
      expect(sortControl?.props.options).toContain('Active');
    });

    test('Unit-41 Athlete list dataBinding uses filteredAthletes', () => {
      const athleteList = athleteListScreen?.components.find((c: any) => c.id === 'athlete_cards');
      expect(athleteList?.dataBinding).toBe('mockData.filteredAthletes');
    });

    test('Unit-42 Athlete list has pagination controls', () => {
      const paginationControls = athleteListScreen?.components.find((c: any) => c.id === 'pagination_controls');
      expect(paginationControls).toBeDefined();
    });

    test('Unit-43 Athlete list has empty state message', () => {
      const athleteList = athleteListScreen?.components.find((c: any) => c.id === 'athlete_cards');
      expect(athleteList?.emptyState).toBeDefined();
      expect(athleteList?.emptyState?.title).toBe('No athletes found');
    });

    test('Unit-44 State has pagination and search fields', () => {
      expect(appSpec.state.athleteListSearch).toBeDefined();
      expect(appSpec.state.athleteListSort).toBeDefined();
      expect(appSpec.state.athleteListPage).toBeDefined();
      expect(appSpec.state.athleteListPages).toBeDefined();
      expect(appSpec.state.athleteListTotal).toBeDefined();
    });
  });
});
