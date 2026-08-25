


export const CoverType = {
  HARDCOVER: 'HARDCOVER',
  SOFTCOVER: 'SOFTCOVER',
  LEATHER: 'LEATHER',
  LINEN: 'LINEN',
  ACRYLIC: 'ACRYLIC',
  WOODEN: 'WOODEN',
} as const;

export type CoverType = typeof CoverType[keyof typeof CoverType];

export const COVER_TYPE_METADATA: Record<CoverType, { label: string; description: string }> = {
  [CoverType.HARDCOVER]: {
    label: 'Bìa cứng in hình',
    description: 'Lõi carton lạnh 2-3mm, bọc giấy in hình tràn lề theo yêu cầu.',
  },
  [CoverType.SOFTCOVER]: {
    label: 'Bìa mềm',
    description: 'Giấy Ivory/Couche dầy cán màng, mỏng nhẹ, chi phí thấp.',
  },
  [CoverType.LEATHER]: {
    label: 'Bìa da Simili / PU',
    description: 'Bọc da nhân tạo sang trọng, chống nước, hỗ trợ ép kim/dập nổi.',
  },
  [CoverType.LINEN]: {
    label: 'Bìa vải Linen / Canvas',
    description: 'Bọc vải mộc tinh tế, phong cách Vintage/Artistic.',
  },
  [CoverType.ACRYLIC]: {
    label: 'Bìa Mica / Acrylic',
    description: 'Mặt trước bằng kính Mica trong suốt tạo hiệu ứng nổi khối 3D.',
  },
  [CoverType.WOODEN]: {
    label: 'Bìa gỗ khắc Laser',
    description: 'Khắc mộc mạc hoặc in trực tiếp lên gỗ tự nhiên.',
  },
};

export const PaperType = {
  LUSTRE: 'LUSTRE',
  COUCHE: 'COUCHE',
  GLOSSY: 'GLOSSY',
  MATTE: 'MATTE',
  FINE_ART: 'FINE_ART',
  METALLIC: 'METALLIC',
  CANVAS: 'CANVAS',
} as const;

export type PaperType = typeof PaperType[keyof typeof PaperType];

export const PAPER_TYPE_METADATA: Record<PaperType, { label: string; defaultGsm: number; description: string }> = {
  [PaperType.LUSTRE]: {
    label: 'Giấy Lustre (Giấy lụa)',
    defaultGsm: 230,
    description: 'Bề mặt gân mịn, chống bám vân tay, chống lóa. Chuẩn cho album cưới.',
  },
  [PaperType.COUCHE]: {
    label: 'Giấy Couche / Magno',
    defaultGsm: 200,
    description: 'Láng mịn 2 mặt, màu sắc rực rỡ, mỏng nhẹ, tối ưu chi phí.',
  },
  [PaperType.GLOSSY]: {
    label: 'Giấy Glossy (Bóng)',
    defaultGsm: 210,
    description: 'Bề mặt bóng láng, tương phản cao. Thích hợp photo booth lấy ngay.',
  },
  [PaperType.MATTE]: {
    label: 'Giấy Matte (Mờ)',
    defaultGsm: 200,
    description: 'Bề mặt mờ mịn không phản xạ ánh sáng, hợp sách ảnh nhiều text.',
  },
  [PaperType.FINE_ART]: {
    label: 'Giấy Mỹ thuật (Fine Art)',
    defaultGsm: 250,
    description: 'Sần nhẹ, tông màu trầm ấm nghệ thuật, hoài cổ.',
  },
  [PaperType.METALLIC]: {
    label: 'Giấy Metallic (Ánh kim)',
    defaultGsm: 220,
    description: 'Óng ánh kim loại, tạo độ sâu 3D cho ảnh dạ tiệc, phong cảnh đêm.',
  },
  [PaperType.CANVAS]: {
    label: 'Giấy vân Vải Canvas',
    defaultGsm: 250,
    description: 'Bề mặt vân vải như tranh vẽ, đầm tay.',
  },
};




export const BindingStyle = {
  LAYFLAT: 'LAYFLAT',
  PERFECT_BINDING: 'PERFECT_BINDING',
  WIRE_O: 'WIRE_O',
  SADDLE_STITCH: 'SADDLE_STITCH',
  SCREW_POST: 'SCREW_POST',
} as const;

export type BindingStyle = typeof BindingStyle[keyof typeof BindingStyle];

export const BINDING_STYLE_METADATA: Record<BindingStyle, { label: string; openAngle: string; description: string }> = {
  [BindingStyle.LAYFLAT]: {
    label: 'Gáy Mở phẳng (Layflat)',
    openAngle: '180°',
    description: 'Các trang dán bồi lưng, mở phẳng hoàn toàn không bị khuất gáy. Dành cho album cao cấp.',
  },
  [BindingStyle.PERFECT_BINDING]: {
    label: 'Gáy Keo nhiệt (Magazine)',
    openAngle: '120° - 150°',
    description: 'Phay gáy dán keo nóng chuẩn tạp chí, chứa được nhiều trang, mỏng nhẹ.',
  },
  [BindingStyle.WIRE_O]: {
    label: 'Gáy Lò xo',
    openAngle: '360°',
    description: 'Đục lỗ xỏ lò xo kim loại/nhựa. Thích hợp làm lịch, sổ tay, photo booth tập.',
  },
  [BindingStyle.SADDLE_STITCH]: {
    label: 'Khâu chỉ / Đóng kim gáy',
    openAngle: '160° - 170°',
    description: 'May chỉ hoặc bấm kim giữa tập trang, giở lật dễ dàng, không lo bung trang.',
  },
  [BindingStyle.SCREW_POST]: {
    label: 'Đóng đinh ốc',
    openAngle: '180°',
    description: 'Cố định bằng đinh ốc tháo rời được, cho phép thêm/bớt trang sau này.',
  },
};