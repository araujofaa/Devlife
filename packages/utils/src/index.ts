export const formatDate = (date: Date): string => {
return date.toISOString();
};

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
