interface PaymentInitiationData {
    amount: number;
    phoneNumber?: string;
    email: string;
    name: string;
    description: string;
    reference: string;
    callbackUrl: string;
    returnUrl?: string;
}
interface PaymentResponse {
    success: boolean;
    transactionId?: string;
    paymentUrl?: string;
    qrCode?: string;
    reference: string;
    status: 'pending' | 'success' | 'failed';
    message?: string;
}
interface PaymentStatusResponse {
    success: boolean;
    status: 'pending' | 'processing' | 'success' | 'failed' | 'cancelled';
    amount?: number;
    transactionId?: string;
    message?: string;
}
declare class PaymentAggregatorService {
    private apiKey;
    private apiSecret;
    private baseUrl;
    private isProduction;
    constructor();
    initiatePayment(data: PaymentInitiationData): Promise<PaymentResponse>;
    checkPaymentStatus(transactionId: string): Promise<PaymentStatusResponse>;
    handleCallback(payload: any): Promise<any>;
    refundPayment(transactionId: string, amount?: number): Promise<PaymentResponse>;
}
export declare const paymentAggregatorService: PaymentAggregatorService;
export {};
//# sourceMappingURL=paymentAggregatorService.d.ts.map