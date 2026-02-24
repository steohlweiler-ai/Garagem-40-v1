
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useReminderMutations } from './useReminderMutations';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dataProvider
vi.mock('../services/dataProvider', () => ({
    dataProvider: {
        addReminder: vi.fn(),
        updateReminder: vi.fn(),
        deleteReminder: vi.fn(),
        setReminderStatus: vi.fn(),
    },
}));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client= { queryClient } >
    { children }
    </QueryClientProvider>
);

describe('useReminderMutations', () => {
    it('should be exported and return expected mutation objects', () => {
        const { result } = renderHook(() => useReminderMutations('test-id'), { wrapper });

        expect(result.current).toBeDefined();
        expect(result.current.addReminder).toBeDefined();
        expect(result.current.updateReminder).toBeDefined();
        expect(result.current.toggleStatus).toBeDefined();
        expect(result.current.deleteReminder).toBeDefined();
    });
});
