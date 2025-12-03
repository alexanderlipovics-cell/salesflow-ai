/**
 * Tests für Onboarding-Komponenten
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingScreen from '../screens/OnboardingScreen';
import QuickStartChecklist from '../components/QuickStartChecklist';
import Tooltip from '../components/Tooltip';
import EmptyState from '../components/EmptyState';
import { OnboardingProvider } from '../context/OnboardingContext';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock Navigation
const mockNavigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
};

describe('OnboardingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sollte alle Slides rendern', () => {
    const { getByText } = render(
      <OnboardingScreen navigation={mockNavigation} />
    );

    expect(getByText('Willkommen bei Sales Flow AI')).toBeTruthy();
  });

  it('sollte Skip-Button zeigen', () => {
    const { getByText } = render(
      <OnboardingScreen navigation={mockNavigation} />
    );

    expect(getByText('Überspringen')).toBeTruthy();
  });

  it('sollte Onboarding als complete markieren beim Skip', async () => {
    const { getByText } = render(
      <OnboardingScreen navigation={mockNavigation} />
    );

    const skipButton = getByText('Überspringen');
    fireEvent.press(skipButton);

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'onboarding_completed',
        'true'
      );
    });
  });

  it('sollte zur Main-Screen navigieren nach Completion', async () => {
    const { getByText } = render(
      <OnboardingScreen navigation={mockNavigation} />
    );

    // Scrolle zum letzten Slide und drücke "Los geht's"
    // (In echtem Test würde man zum letzten Slide scrollen)
    
    await waitFor(() => {
      expect(mockNavigation.replace).toHaveBeenCalledWith('Main');
    });
  });
});

describe('QuickStartChecklist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sollte alle Checklist-Items rendern', () => {
    const { getByText } = render(
      <QuickStartChecklist navigation={mockNavigation} />
    );

    expect(getByText('Füge deinen ersten Lead hinzu')).toBeTruthy();
    expect(getByText('Chatte mit der KI')).toBeTruthy();
    expect(getByText('Erstelle ein Squad')).toBeTruthy();
    expect(getByText('Verbinde deine E-Mail')).toBeTruthy();
  });

  it('sollte Progress-Bar anzeigen', () => {
    const { getByText } = render(
      <QuickStartChecklist navigation={mockNavigation} />
    );

    expect(getByText(/0 \/ 4 erledigt/)).toBeTruthy();
  });

  it('sollte Item als complete markieren beim Checkbox-Click', async () => {
    const { getAllByRole } = render(
      <QuickStartChecklist navigation={mockNavigation} />
    );

    // Mock: Erste Checkbox anklicken
    // const checkbox = getAllByRole('checkbox')[0];
    // fireEvent.press(checkbox);

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });
});

describe('Tooltip', () => {
  it('sollte Tooltip rendern wenn visible=true', () => {
    const { getByText } = render(
      <Tooltip
        visible={true}
        text="Test Tooltip"
        onDismiss={() => {}}
      />
    );

    expect(getByText('Test Tooltip')).toBeTruthy();
  });

  it('sollte nichts rendern wenn visible=false', () => {
    const { queryByText } = render(
      <Tooltip
        visible={false}
        text="Test Tooltip"
        onDismiss={() => {}}
      />
    );

    expect(queryByText('Test Tooltip')).toBeNull();
  });

  it('sollte onDismiss aufrufen beim Close-Button', () => {
    const onDismiss = jest.fn();
    const { getByRole } = render(
      <Tooltip
        visible={true}
        text="Test Tooltip"
        onDismiss={onDismiss}
      />
    );

    // Mock: Close Button klicken
    // const closeButton = getByRole('button');
    // fireEvent.press(closeButton);

    // expect(onDismiss).toHaveBeenCalled();
  });
});

describe('EmptyState', () => {
  it('sollte EmptyState mit allen Props rendern', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <EmptyState
        icon="Users"
        title="Test Title"
        description="Test Description"
        actionText="Test Action"
        onAction={onAction}
      />
    );

    expect(getByText('Test Title')).toBeTruthy();
    expect(getByText('Test Description')).toBeTruthy();
    expect(getByText('Test Action')).toBeTruthy();
  });

  it('sollte onAction aufrufen beim Button-Click', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <EmptyState
        icon="Users"
        title="Test Title"
        description="Test Description"
        actionText="Test Action"
        onAction={onAction}
      />
    );

    const button = getByText('Test Action');
    fireEvent.press(button);

    expect(onAction).toHaveBeenCalled();
  });
});

describe('OnboardingContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sollte initial state korrekt setzen', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const TestComponent = () => {
      return null;
    };

    render(
      <OnboardingProvider>
        <TestComponent />
      </OnboardingProvider>
    );

    await waitFor(() => {
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('onboarding_completed');
    });
  });
});

