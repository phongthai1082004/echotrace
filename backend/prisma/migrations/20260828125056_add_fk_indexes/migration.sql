-- CreateIndex
CREATE INDEX "Cashflow_orderId_idx" ON "Cashflow"("orderId");

-- CreateIndex
CREATE INDEX "Cashflow_transactionId_idx" ON "Cashflow"("transactionId");

-- CreateIndex
CREATE INDEX "Expense_orderId_idx" ON "Expense"("orderId");

-- CreateIndex
CREATE INDEX "Expense_transactionId_idx" ON "Expense"("transactionId");

-- CreateIndex
CREATE INDEX "Income_orderId_idx" ON "Income"("orderId");
