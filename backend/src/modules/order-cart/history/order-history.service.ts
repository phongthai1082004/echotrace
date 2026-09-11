import { inject, injectable } from 'tsyringe';
import { OrderRepository } from '../repositories/order.repository.js';

export interface IOrderHistoryService {
	listMyOrders(userId: number): Promise<any[]>;
	listAllOrders(): Promise<any[]>;
	getOrderById(id: number): Promise<any>;
}

@injectable()
export class OrderHistoryService implements IOrderHistoryService {
	constructor(@inject('OrderRepository') private orderRepo: OrderRepository) {}

	async listMyOrders(userId: number): Promise<any[]> {
		return this.orderRepo.listMyOrders(userId);
	}

	async listAllOrders(): Promise<any[]> {
		return this.orderRepo.listAllOrders();
	}

	async getOrderById(id: number): Promise<any> {
		return this.orderRepo.getOrderById(id);
	}
}
