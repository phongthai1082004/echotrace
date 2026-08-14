import type { PaymentType, PaymentGateway, TransactionStatus } from '../../enums/payment.enum.js'
 
export interface PaymentItemDto {
  name: string;
  quantity: number;
  price: number;
  unit?: string;
  taxPercentage?: number;
}
 
export interface CreatePaymentLinkDto {
  orderCode: number;         
  amount: number;              
  type: PaymentType;            
  description: string;
  buyerName?: string;
  buyerCompanyName?: string;
  buyerTaxCode?: string;
  buyerAddress?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  items?: PaymentItemDto[];
  cancelUrl: string;
  returnUrl: string;
  invoice?: {
    buyerNotGetInvoice?: boolean;
    taxPercentage?: number;
  };
  expiredAt?: number; 
}

export interface PaymentLinkResponse {
  gateway: PaymentGateway;            
  gatewayTransactionCode: string;     
  amount: number;                      
  status: TransactionStatus;          
  checkoutUrl?: string;              
  qrCode?: string;                    
  bankAccount?: string;              
  bankBin?: string;
  accountName?: string;
  content?: string;                   
  raw: unknown;                         
}

export interface WebhookProcessResult {
  orderCode: string;                   
  gateway: PaymentGateway;             
  gatewayTransactionCode: string;       
  amount: number;                       
  status: TransactionStatus;           
  transactionTime: Date;               
  bankAccount?: string;            
  content?: string;                     
  reference?: string;                  
  rawPayload: any;               
  isValidSignature: boolean;             
}