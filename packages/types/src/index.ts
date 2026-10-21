export interface ApiResponse<T = any> {
success: boolean;
data?: T;
message?: string;
error?: {
code: string;
message: string;
details?: any[];
};
}

export interface HealthResponse {
status: string;
timestamp: string;
}
