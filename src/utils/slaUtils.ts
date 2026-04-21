import { differenceInDays, parseISO, addDays } from 'date-fns';
// No types needed here

export const calculateSLA = (startDateStr: string, targetDays: number) => {
    const startDate = parseISO(startDateStr);
    const today = new Date();
    const daysConsumed = differenceInDays(today, startDate);
    const remainingDays = targetDays - daysConsumed;
    const isBreached = remainingDays < 0;

    return {
        daysConsumed,
        remainingDays,
        isBreached,
        targetDate: addDays(startDate, targetDays)
    };
};

export const getRequestID = (year: number, sequence: number) => {
    return `FR-${year}-${sequence.toString().padStart(5, '0')}`;
};

export const getStatusColor = (status: string, isBreached: boolean) => {
    if (isBreached) return 'bg-red-500 text-white';
    switch (status) {
        case 'Activated': return 'bg-green-500 text-white';
        case 'Pending': return 'bg-yellow-500 text-black';
        case 'Returned': return 'bg-orange-500 text-white';
        case 'Rejected': return 'bg-red-600 text-white';
        default: return 'bg-gray-500 text-white';
    }
};
