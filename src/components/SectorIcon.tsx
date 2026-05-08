import type { FC } from 'react';

interface IconProps {
  color: string;
  size?: number;
}

const S = {
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
};

// Atom — raw materials, gases, metals
export const BaseMaterialsIcon: FC<IconProps> = ({ color, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={1.5} {...S}>
    <circle cx="12" cy="12" r="2" fill={color} stroke="none" />
    <ellipse cx="12" cy="12" rx="10" ry="3.5" />
    <ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(60 12 12)" />
    <ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(-60 12 12)" />
  </svg>
);

// Lightning bolt — power & specialty energy
export const SpecialtyEnergyIcon: FC<IconProps> = ({ color, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={1.5} {...S}>
    <path d="M13 2L4 13h7l-1 9 10-12h-7l1-8z" fill={`${color}18`} />
    <path d="M13 2L4 13h7l-1 9 10-12h-7l1-8z" />
  </svg>
);

// Hard hat / crane — EPC construction
export const ConstructionEpcIcon: FC<IconProps> = ({ color, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={1.5} {...S}>
    <path d="M3 18h18" />
    <path d="M5 18v-4a7 7 0 0 1 14 0v4" />
    <path d="M12 7V4" />
    <path d="M5 14h14" />
    <line x1="3" y1="21" x2="21" y2="21" />
  </svg>
);

// Circuit node graph — electronic design / schematic
export const EdaSoftwareIcon: FC<IconProps> = ({ color, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={1.5} {...S}>
    <circle cx="4" cy="12" r="2" />
    <circle cx="12" cy="4" r="2" />
    <circle cx="20" cy="12" r="2" />
    <circle cx="12" cy="20" r="2" />
    <circle cx="12" cy="12" r="2" />
    <path d="M6 12h4M14 12h4M12 6v4M12 14v4" />
  </svg>
);

// Crosshair / bullseye — precision lithography machines
export const WaferEquipIcon: FC<IconProps> = ({ color, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={1.5} {...S}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.5" fill={color} stroke="none" />
    <line x1="2" y1="12" x2="7" y2="12" />
    <line x1="17" y1="12" x2="22" y2="12" />
    <line x1="12" y1="2" x2="12" y2="7" />
    <line x1="12" y1="17" x2="12" y2="22" />
  </svg>
);

// Factory building — physical chip foundry
export const FabsFoundriesIcon: FC<IconProps> = ({ color, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={1.5} {...S}>
    <path d="M2 20V10l5 3.5V10l5 3.5V7l5-4v17z" fill={`${color}12`} />
    <path d="M2 20V10l5 3.5V10l5 3.5V7l5-4v17z" />
    <path d="M17 3h3v17" />
    <line x1="2" y1="20" x2="22" y2="20" />
    <rect x="9" y="15" width="3.5" height="5" />
  </svg>
);

// GPU chip with heat fins — AI accelerators & HBM memory
export const ComputeMemoryIcon: FC<IconProps> = ({ color, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={1.5} {...S}>
    <rect x="4" y="6" width="16" height="12" rx="1.5" fill={`${color}10`} />
    <rect x="4" y="6" width="16" height="12" rx="1.5" />
    <rect x="7" y="9" width="10" height="6" rx="0.5" fill={`${color}18`} />
    <rect x="7" y="9" width="10" height="6" rx="0.5" />
    {/* heat fins top */}
    <line x1="7"  y1="6" x2="7"  y2="3" />
    <line x1="10" y1="6" x2="10" y2="3" />
    <line x1="14" y1="6" x2="14" y2="3" />
    <line x1="17" y1="6" x2="17" y2="3" />
    {/* heat fins bottom */}
    <line x1="7"  y1="18" x2="7"  y2="21" />
    <line x1="10" y1="18" x2="10" y2="21" />
    <line x1="14" y1="18" x2="14" y2="21" />
    <line x1="17" y1="18" x2="17" y2="21" />
    <circle cx="12" cy="12" r="1" fill={color} stroke="none" />
  </svg>
);

// Server rack with network link — data center hosting
export const HostingReitsIcon: FC<IconProps> = ({ color, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={1.5} {...S}>
    <rect x="2" y="3" width="20" height="5" rx="1" fill={`${color}14`} />
    <rect x="2" y="3" width="20" height="5" rx="1" />
    <rect x="2" y="10" width="20" height="5" rx="1" fill={`${color}0a`} />
    <rect x="2" y="10" width="20" height="5" rx="1" />
    <line x1="5" y1="5.5" x2="9" y2="5.5" />
    <line x1="5" y1="12.5" x2="9" y2="12.5" />
    <circle cx="17" cy="5.5" r="1" fill={color} stroke="none" />
    <circle cx="17" cy="12.5" r="1" fill={color} stroke="none" />
    {/* network legs */}
    <path d="M8 15v3M12 15v3M16 15v3" />
    <path d="M6 21h12" />
  </svg>
);

// CPU die with bond pads — fabless chip designers
export const FablessIcon: FC<IconProps> = ({ color, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={1.5} {...S}>
    <rect x="5" y="5" width="14" height="14" rx="1" fill={`${color}10`} />
    <rect x="5" y="5" width="14" height="14" rx="1" />
    <rect x="8.5" y="8.5" width="7" height="7" rx="0.5" fill={`${color}18`} />
    <line x1="8.5" y1="5"  x2="8.5" y2="2"  />
    <line x1="12"  y1="5"  x2="12"  y2="2"  />
    <line x1="15.5" y1="5" x2="15.5" y2="2" />
    <line x1="8.5"  y1="19" x2="8.5"  y2="22" />
    <line x1="12"   y1="19" x2="12"   y2="22" />
    <line x1="15.5" y1="19" x2="15.5" y2="22" />
    <line x1="5" y1="8.5"  x2="2" y2="8.5"  />
    <line x1="5" y1="12"   x2="2" y2="12"   />
    <line x1="5" y1="15.5" x2="2" y2="15.5" />
    <line x1="19" y1="8.5"  x2="22" y2="8.5"  />
    <line x1="19" y1="12"   x2="22" y2="12"   />
    <line x1="19" y1="15.5" x2="22" y2="15.5" />
    <circle cx="12" cy="12" r="1" fill={color} stroke="none" />
  </svg>
);

// Chip overlapping factory belt — integrated design + manufacturing
export const IdmsIcon: FC<IconProps> = ({ color, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={1.5} {...S}>
    <rect x="6" y="3" width="12" height="10" rx="1" fill={`${color}10`} />
    <rect x="6" y="3" width="12" height="10" rx="1" />
    <rect x="9" y="6" width="6" height="4" rx="0.5" fill={`${color}18`} />
    <line x1="12" y1="13" x2="12" y2="15" />
    <path d="M3 21V16l4.5 2.5V16L12 18.5 16.5 16v2.5L21 16v5z" fill={`${color}0e`} />
    <path d="M3 21V16l4.5 2.5V16L12 18.5 16.5 16v2.5L21 16v5z" />
    <line x1="3" y1="21" x2="21" y2="21" />
  </svg>
);

// Cloud with code chevrons — enterprise software / cloud AI
export const EnterpriseSoftwareIcon: FC<IconProps> = ({ color, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={1.5} {...S}>
    <path d="M6 18a4.5 4.5 0 0 1-.5-9 5.5 5.5 0 0 1 10.5-1A3.5 3.5 0 0 1 19 15H6z"
      fill={`${color}10`} />
    <path d="M6 18a4.5 4.5 0 0 1-.5-9 5.5 5.5 0 0 1 10.5-1A3.5 3.5 0 0 1 19 15H6z" />
    <path d="M9 13.5l-2-2 2-2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 13.5l2-2-2-2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Server rack with network links — tech equipment & devices
export const TechEquipmentIcon: FC<IconProps> = ({ color, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={1.5} {...S}>
    <rect x="2" y="4"  width="20" height="5" rx="0.5" fill={`${color}14`} />
    <rect x="2" y="4"  width="20" height="5" rx="0.5" />
    <rect x="2" y="11" width="20" height="5" rx="0.5" fill={`${color}0a`} />
    <rect x="2" y="11" width="20" height="5" rx="0.5" />
    <line x1="5" y1="6.5"  x2="10" y2="6.5"  />
    <line x1="5" y1="13.5" x2="10" y2="13.5" />
    <circle cx="18" cy="6.5"  r="1" fill={color} stroke="none" />
    <circle cx="18" cy="13.5" r="1" fill={color} stroke="none" />
    <path d="M7 16v3M12 16v3M17 16v3" />
    <line x1="5" y1="19" x2="19" y2="19" />
  </svg>
);

export const SECTOR_ICONS: Record<string, FC<IconProps>> = {
  base_materials:      BaseMaterialsIcon,
  specialty_energy:    SpecialtyEnergyIcon,
  fabless:             FablessIcon,
  eda:                 EdaSoftwareIcon,
  wafer_equip:         WaferEquipIcon,
  fabs:                FabsFoundriesIcon,
  idms:                IdmsIcon,
  enterprise_software: EnterpriseSoftwareIcon,
  tech_equipment:      TechEquipmentIcon,
};
