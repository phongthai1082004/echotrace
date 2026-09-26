export interface TriText {
	title: string;
	message: string;
	i18n: { title: Record<string, string>; message: Record<string, string> };
}

// (test cũ assert), en/es dịch sẵn. Tiền dùng chung 1 format vi-VN + đ mọi thứ tiếng.
const vnd = (n: number | string) => `${Number(n).toLocaleString('vi-VN')}đ`;

type V = Record<string, string | number>;
type T = { title: { vi: (v: V) => string; en: (v: V) => string; es: (v: V) => string }; message: { vi: (v: V) => string; en: (v: V) => string; es: (v: V) => string } };

const D: Record<string, T> = {
	processing: {
		title: {
			vi: (v) => `Đơn ${v.code} đang được xử lý`,
			en: (v) => `Order ${v.code} is being processed`,
			es: (v) => `El pedido ${v.code} se está procesando`,
		},
		message: {
			vi: (v) => `<p>Đơn <b>${v.code}</b> đã được chuyển xưởng in.</p>`,
			en: (v) => `<p>Order <b>${v.code}</b> has been sent to print.</p>`,
			es: (v) => `<p>El pedido <b>${v.code}</b> se ha enviado a imprenta.</p>`,
		},
	},
	shipping: {
		title: {
			vi: (v) => `Đơn ${v.code} đang giao`,
			en: (v) => `Order ${v.code} is on its way`,
			es: (v) => `El pedido ${v.code} está en camino`,
		},
		message: {
			vi: (v) => `<p>Đơn <b>${v.code}</b> đang trên đường giao tới bạn.</p>`,
			en: (v) => `<p>Order <b>${v.code}</b> is on its way to you.</p>`,
			es: (v) => `<p>El pedido <b>${v.code}</b> está en camino hacia ti.</p>`,
		},
	},
	delivered: {
		title: {
			vi: (v) => `Đã giao đơn ${v.code}`,
			en: (v) => `Order ${v.code} delivered`,
			es: (v) => `Pedido ${v.code} entregado`,
		},
		message: {
			vi: (v) => `<p>Đơn <b>${v.code}</b> đã được giao thành công. Cảm ơn bạn!</p>`,
			en: (v) => `<p>Order <b>${v.code}</b> was delivered successfully. Thank you!</p>`,
			es: (v) => `<p>El pedido <b>${v.code}</b> se ha entregado correctamente. ¡Gracias!</p>`,
		},
	},
	pendingRefund: {
		title: {
			vi: (v) => `Đơn ${v.code} chờ hoàn tiền`,
			en: (v) => `Order ${v.code} awaiting refund`,
			es: (v) => `Pedido ${v.code} pendiente de reembolso`,
		},
		message: {
			vi: (v) => `<p>Đơn <b>${v.code}</b> đang chờ hoàn tiền.</p>`,
			en: (v) => `<p>Order <b>${v.code}</b> is awaiting a refund.</p>`,
			es: (v) => `<p>El pedido <b>${v.code}</b> está pendiente de reembolso.</p>`,
		},
	},
	cancelRefundUser: {
		title: {
			vi: (v) => `Đơn ${v.code} chờ hoàn tiền`,
			en: (v) => `Order ${v.code} awaiting refund`,
			es: (v) => `Pedido ${v.code} pendiente de reembolso`,
		},
		message: {
			vi: (v) => `<p>Đơn <b>${v.code}</b> đã hủy. Số tiền <b>${vnd(v.amount)}</b> đang chờ hoàn.</p>`,
			en: (v) => `<p>Order <b>${v.code}</b> was cancelled. <b>${vnd(v.amount)}</b> is awaiting a refund.</p>`,
			es: (v) => `<p>El pedido <b>${v.code}</b> se ha cancelado. <b>${vnd(v.amount)}</b> está pendiente de reembolso.</p>`,
		},
	},
	cancelRefundAdmin: {
		title: {
			vi: (v) => `Khách hủy đơn ${v.code} (chờ hoàn tiền)`,
			en: (v) => `Customer cancelled order ${v.code} (refund pending)`,
			es: (v) => `El cliente canceló el pedido ${v.code} (reembolso pendiente)`,
		},
		message: {
			vi: (v) => `<p>Khách vừa hủy đơn <b>${v.code}</b> đã trả <b>${vnd(v.amount)}</b> — cần xử lý hoàn tiền.</p>`,
			en: (v) => `<p>Customer just cancelled order <b>${v.code}</b> (paid <b>${vnd(v.amount)}</b>) — refund needed.</p>`,
			es: (v) => `<p>El cliente acaba de cancelar el pedido <b>${v.code}</b> (pagado <b>${vnd(v.amount)}</b>) — se necesita reembolso.</p>`,
		},
	},
	cancelledUser: {
		title: {
			vi: (v) => `Đơn ${v.code} đã hủy`,
			en: (v) => `Order ${v.code} cancelled`,
			es: (v) => `Pedido ${v.code} cancelado`,
		},
		message: {
			vi: (v) => `<p>Đơn <b>${v.code}</b> đã được hủy.</p>`,
			en: (v) => `<p>Order <b>${v.code}</b> has been cancelled.</p>`,
			es: (v) => `<p>El pedido <b>${v.code}</b> se ha cancelado.</p>`,
		},
	},
	cancelUnpaidAdmin: {
		title: {
			vi: (v) => `Khách hủy đơn ${v.code} (chưa thanh toán)`,
			en: (v) => `Customer cancelled unpaid order ${v.code}`,
			es: (v) => `El cliente canceló el pedido impago ${v.code}`,
		},
		message: {
			vi: (v) => `<p>Khách vừa hủy đơn chưa thanh toán <b>${v.code}</b>.</p>`,
			en: (v) => `<p>Customer just cancelled unpaid order <b>${v.code}</b>.</p>`,
			es: (v) => `<p>El cliente acaba de cancelar el pedido impago <b>${v.code}</b>.</p>`,
		},
	},
	cancelProcessingAdmin: {
		title: {
			vi: (v) => `Khách hủy đơn ${v.code}`,
			en: (v) => `Customer cancelled order ${v.code}`,
			es: (v) => `El cliente canceló el pedido ${v.code}`,
		},
		message: {
			vi: (v) => `<p>Khách vừa hủy đơn <b>${v.code}</b>.</p>`,
			en: (v) => `<p>Customer just cancelled order <b>${v.code}</b>.</p>`,
			es: (v) => `<p>El cliente acaba de cancelar el pedido <b>${v.code}</b>.</p>`,
		},
	},
	refunded: {
		title: {
			vi: (v) => `Đã hoàn tiền đơn ${v.code}`,
			en: (v) => `Order ${v.code} refunded`,
			es: (v) => `Pedido ${v.code} reembolsado`,
		},
		message: {
			vi: (v) => `<p>Đơn <b>${v.code}</b> đã được hoàn <b>${vnd(v.amount)}</b>.</p>`,
			en: (v) => `<p>Order <b>${v.code}</b> has been refunded <b>${vnd(v.amount)}</b>.</p>`,
			es: (v) => `<p>El pedido <b>${v.code}</b> ha sido reembolsado por <b>${vnd(v.amount)}</b>.</p>`,
		},
	},
	forceStatus: {
		title: {
			vi: (v) => `Cập nhật đơn ${v.code}`,
			en: (v) => `Order ${v.code} updated`,
			es: (v) => `Pedido ${v.code} actualizado`,
		},
		message: {
			vi: (v) => `<p>Đơn <b>${v.code}</b> chuyển sang trạng thái <b>${v.status}</b>.</p>`,
			en: (v) => `<p>Order <b>${v.code}</b> moved to status <b>${v.status}</b>.</p>`,
			es: (v) => `<p>El pedido <b>${v.code}</b> pasó al estado <b>${v.status}</b>.</p>`,
		},
	},
	returnRequestedAdmin: {
		title: {
			vi: (v) => `Yêu cầu đổi trả đơn ${v.code}`,
			en: (v) => `Return request for order ${v.code}`,
			es: (v) => `Solicitud de devolución del pedido ${v.code}`,
		},
		message: {
			vi: (v) => `<p>Khách vừa gửi yêu cầu đổi trả đơn <b>${v.code}</b>${v.reason ? `: ${v.reason}` : ''}.</p>`,
			en: (v) => `<p>Customer requested a return for order <b>${v.code}</b>${v.reason ? `: ${v.reason}` : ''}.</p>`,
			es: (v) => `<p>El cliente solicitó una devolución del pedido <b>${v.code}</b>${v.reason ? `: ${v.reason}` : ''}.</p>`,
		},
	},
	returnApproved: {
		title: {
			vi: (v) => `Yêu cầu đổi trả đơn ${v.code} được duyệt`,
			en: (v) => `Return request for order ${v.code} approved`,
			es: (v) => `Solicitud de devolución del pedido ${v.code} aprobada`,
		},
		message: {
			vi: (v) => `<p>Yêu cầu đổi trả đơn <b>${v.code}</b> đã được duyệt. Chúng tôi sẽ liên hệ để nhận lại hàng.</p>`,
			en: (v) => `<p>The return request for order <b>${v.code}</b> was approved. We will contact you for pickup.</p>`,
			es: (v) => `<p>La solicitud de devolución del pedido <b>${v.code}</b> fue aprobada. Te contactaremos para recogerlo.</p>`,
		},
	},
	reshipped: {
		title: {
			vi: (v) => `Đơn ${v.code} đã được gửi lại`,
			en: (v) => `Order ${v.code} has been reshipped`,
			es: (v) => `El pedido ${v.code} ha sido reenviado`,
		},
		message: {
			vi: (v) => `<p>Hàng bảo hành/đổi trả của đơn <b>${v.code}</b> đã được gửi lại.</p>`,
			en: (v) => `<p>The warranty/return items for order <b>${v.code}</b> have been reshipped.</p>`,
			es: (v) => `<p>Los artículos de garantía/devolución del pedido <b>${v.code}</b> han sido reenviados.</p>`,
		},
	},
	defectNoted: {
		title: {
			vi: (v) => `Đã ghi nhận lỗi đơn ${v.code}`,
			en: (v) => `Defect recorded for order ${v.code}`,
			es: (v) => `Defecto registrado para el pedido ${v.code}`,
		},
		message: {
			vi: (v) => `<p>Báo lỗi của đơn <b>${v.code}</b> đã được ghi nhận và đang xử lý.</p>`,
			en: (v) => `<p>The defect report for order <b>${v.code}</b> was recorded and is being handled.</p>`,
			es: (v) => `<p>El reporte de defecto del pedido <b>${v.code}</b> fue registrado y está en proceso.</p>`,
		},
	},
	newOrderAdmin: {
		title: {
			vi: (v) => `Đơn mới ${v.code}`,
			en: (v) => `New order ${v.code}`,
			es: (v) => `Nuevo pedido ${v.code}`,
		},
		message: {
			vi: (v) => `<p>Khách vừa tạo đơn <b>${v.code}</b> trị giá <b>${vnd(v.total)}</b>.</p>`,
			en: (v) => `<p>Customer just placed order <b>${v.code}</b> worth <b>${vnd(v.total)}</b>.</p>`,
			es: (v) => `<p>El cliente acaba de crear el pedido <b>${v.code}</b> por <b>${vnd(v.total)}</b>.</p>`,
		},
	},
	paidFull: {
		title: {
			vi: (v) => `Đã nhận thanh toán đơn ${v.code}`,
			en: (v) => `Payment received for order ${v.code}`,
			es: (v) => `Pago recibido para el pedido ${v.code}`,
		},
		message: {
			vi: (v) => `<p>Xin chào ${v.name || 'bạn'},</p><p>Chúng tôi đã nhận <b>${vnd(v.paid)}</b> cho đơn <b>${v.code}</b>.</p><p>Đơn hàng đã được thanh toán đủ và đang được xử lý.</p>`,
			en: (v) => `<p>Hello ${v.name || 'friend'},</p><p>We received <b>${vnd(v.paid)}</b> for order <b>${v.code}</b>.</p><p>The order is fully paid and being processed.</p>`,
			es: (v) => `<p>Hola ${v.name || 'amigo'},</p><p>Recibimos <b>${vnd(v.paid)}</b> para el pedido <b>${v.code}</b>.</p><p>El pedido está totalmente pagado y en proceso.</p>`,
		},
	},
	deposit: {
		title: {
			vi: (v) => `Đã nhận tiền cọc đơn ${v.code}`,
			en: (v) => `Deposit received for order ${v.code}`,
			es: (v) => `Anticipo recibido para el pedido ${v.code}`,
		},
		message: {
			vi: (v) => `<p>Xin chào ${v.name || 'bạn'},</p><p>Chúng tôi đã nhận <b>${vnd(v.paid)}</b> cho đơn <b>${v.code}</b>.</p><p>Đây là 50% tiền cọc. Phần còn lại <b>${vnd(v.rest)}</b> sẽ thu khi giao hàng (COD).</p>`,
			en: (v) => `<p>Hello ${v.name || 'friend'},</p><p>We received <b>${vnd(v.paid)}</b> for order <b>${v.code}</b>.</p><p>This is the 50% deposit. The remaining <b>${vnd(v.rest)}</b> is due on delivery (COD).</p>`,
			es: (v) => `<p>Hola ${v.name || 'amigo'},</p><p>Recibimos <b>${vnd(v.paid)}</b> para el pedido <b>${v.code}</b>.</p><p>Este es el anticipo del 50%. Los <b>${vnd(v.rest)}</b> restantes se cobran en la entrega (COD).</p>`,
		},
	},
};

export type OrderTextKey = keyof typeof D;

export function orderText(key: OrderTextKey, vars: V): TriText {
	const t = D[key];
	return {
		title: t.title.vi(vars),
		message: t.message.vi(vars),
		i18n: {
			title: { vi: t.title.vi(vars), en: t.title.en(vars), es: t.title.es(vars) },
			message: { vi: t.message.vi(vars), en: t.message.en(vars), es: t.message.es(vars) },
		},
	};
}
