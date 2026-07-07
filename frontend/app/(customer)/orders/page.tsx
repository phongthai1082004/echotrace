"use client";

const customerOrders = [
  { id: "TC-0041", journal: "West Africa Circuit", pages: 48, status: "pending", date: "2024-07-01", cover: "https://images.unsplash.com/photo-1533093814449-96af23c8f43f?w=400&h=530&fit=crop&auto=format" },
  { id: "TC-0033", journal: "Dolomite Journals", pages: 56, status: "quality-check", date: "2024-06-15", cover: "https://images.unsplash.com/photo-1765660996991-31f345c40247?w=400&h=530&fit=crop&auto=format" },
  { id: "TC-0029", journal: "Lagos to Accra", pages: 32, status: "shipped", date: "2024-06-05", cover: "https://images.unsplash.com/photo-1775830150436-1cbe3d5ad3c6?w=400&h=530&fit=crop&auto=format" },
  { id: "TC-0021", journal: "Mekong Delta", pages: 40, status: "shipped", date: "2024-05-12", cover: "https://images.unsplash.com/photo-1757679789909-29f58dfd065b?w=400&h=530&fit=crop&auto=format" },
];

const statusColor: Record<string, string> = { pending: "#dbdad6", printing: "#C4A882", "quality-check": "#9CB8A8", shipped: "#0D1F1A" };
const statusText: Record<string, string> = { pending: "#1a1a1a", printing: "#1a1a1a", "quality-check": "#1a1a1a", shipped: "#FDFBF7" };
const statusLabel: Record<string, string> = { pending: "Pending", printing: "Printing", "quality-check": "QC", shipped: "Shipped" };

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] pt-15">
      <div className="px-8 py-12" style={{ borderBottom: "0.5px solid #dbdad6" }}>
        <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-2" style={{ color: "rgba(26,26,26,0.38)" }}>Customer Portal</p>
        <h1 className="font-['Playfair_Display'] text-4xl text-[#1a1a1a]">Orders</h1>
      </div>

      <div className="px-8 py-12">
        <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-6" style={{ color: "rgba(26,26,26,0.38)" }}>Order History</p>
        <div className="overflow-x-auto -mx-8 px-8 pb-8" style={{ scrollbarWidth: "none" }}>
          <div className="flex" style={{ width: "max-content", borderLeft: "0.5px solid #dbdad6" }}>
            {customerOrders.map((order) => (
              <div key={order.id} className="shrink-0 w-70 group cursor-pointer" style={{ borderRight: "0.5px solid #dbdad6" }}>
                <div className="relative overflow-hidden bg-[#e8e6e0]" style={{ aspectRatio: "3/4" }}>
                  <img src={order.cover} alt={order.journal} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                  <div className="absolute top-3 left-3">
                    <span className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase px-2 py-1"
                      style={{ background: statusColor[order.status], color: statusText[order.status] }}>{statusLabel[order.status]}</span>
                  </div>
                </div>
                <div className="p-5" style={{ borderTop: "0.5px solid #dbdad6" }}>
                  <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-1" style={{ color: "rgba(26,26,26,0.3)" }}>{order.id}</p>
                  <h3 className="font-['Playfair_Display'] text-xl text-[#1a1a1a] mb-3">{order.journal}</h3>
                  <div className="flex justify-between items-center">
                    <p className="font-['JetBrains_Mono'] text-[10px]" style={{ color: "rgba(26,26,26,0.4)" }}>{order.pages} pages</p>
                    <p className="font-['JetBrains_Mono'] text-[9px]" style={{ color: "rgba(26,26,26,0.28)" }}>{order.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
