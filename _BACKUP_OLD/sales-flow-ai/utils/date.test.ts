// utils/date.test.ts

import { formatDueDate } from './date';

// Mock Date für konsistente Tests
const mockDate = new Date('2025-11-30T12:50:00.000Z');

describe('formatDueDate', () => {
    // Die Basiszeit für alle Tests ist 2025-11-30T12:50:00Z (UTC)
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(mockDate);
    });

    afterEach(() => {
        jest.useRealTimers();
    });
    
    it('sollte "Überfällig" zurückgeben, wenn das Datum in der Vergangenheit liegt', () => {
        // 2025-11-30 um 10:00 Uhr (ist 2 Stunden und 50 Minuten her)
        const pastDate = '2025-11-30T10:00:00Z';
        expect(formatDueDate(pastDate)).toBe('Überfällig');
    });

    it('sollte "Heute" + Zeit zurückgeben, wenn das Datum heute fällig ist', () => {
        // 2025-11-30 um 15:00 Uhr (ist in 2 Stunden 10 Minuten)
        const todayDate = '2025-11-30T15:00:00Z';
        expect(formatDueDate(todayDate)).toBe('Heute 15:00');
    });

    it('sollte Monat/Tag + Zeit zurückgeben, wenn das Datum morgen fällig ist', () => {
        // 2025-12-01 um 18:30 Uhr (ist in über 24 Stunden)
        const tomorrowDate = '2025-12-01T18:30:00Z';
        expect(formatDueDate(tomorrowDate)).toBe('1. Dez. 18:30');
    });

    it('sollte Monat/Tag + Zeit zurückgeben, wenn es in genau 24 Stunden ist', () => {
        // 2025-12-01 um 12:50 Uhr (genau 24 Stunden später)
        const nextDayDate = '2025-12-01T12:50:00Z';
        expect(formatDueDate(nextDayDate)).toBe('1. Dez. 12:50');
    });
});

