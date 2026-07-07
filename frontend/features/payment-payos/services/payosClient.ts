export async function createPaymentLink(params: {
  orderId: string;
  amount: number;
  description: string;
  returnUrl: string;
  cancelUrl: string;
}) {
  const response = await fetch("/api/payment/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return response.json();
}
