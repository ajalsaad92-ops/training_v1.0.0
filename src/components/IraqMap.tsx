import React, { useState } from 'react';

export interface GovStats {
  totalCourses: number;
  completed: number;
  inProgress: number;
  delayed: number;
  complianceRate: number;
}

interface IraqMapProps {
  stats: Record<string, GovStats>;
  onGovernorateClick: (name: string) => void;
  selectedGovernorate?: string | null;
}

const GOVERNORATES = [
  { name: '\u062F\u0647\u0648\u0643', path: 'M 75,25 L 135,20 L 145,55 L 130,90 L 85,95 L 65,60 Z', lx: 105, ly: 58, small: false },
  { name: '\u0646\u064A\u0646\u0648\u0649', path: 'M 10,25 L 75,25 L 65,60 L 85,95 L 130,90 L 170,120 L 165,195 L 120,215 L 65,195 L 15,125 Z', lx: 90, ly: 120, small: false },
  { name: '\u0623\u0631\u0628\u064A\u0644', path: 'M 135,20 L 220,15 L 240,60 L 235,125 L 200,140 L 170,120 L 130,90 L 145,55 Z', lx: 185, ly: 78, small: false },
  { name: '\u0627\u0644\u0633\u0644\u064A\u0645\u0627\u0646\u064A\u0629', path: 'M 220,15 L 310,10 L 325,45 L 305,95 L 270,110 L 235,125 L 240,60 Z', lx: 270, ly: 68, small: false },
  { name: '\u062D\u0644\u0628\u062C\u0629', path: 'M 310,10 L 365,15 L 360,55 L 325,45 Z', lx: 340, ly: 33, small: true },
  { name: '\u0643\u0631\u0643\u0648\u0643', path: 'M 170,120 L 200,140 L 235,125 L 270,110 L 285,140 L 265,185 L 215,205 L 175,190 L 165,195 Z', lx: 225, ly: 158, small: false },
  { name: '\u0635\u0644\u0627\u062D \u0627\u0644\u062F\u064A\u0646', path: 'M 120,215 L 165,195 L 175,190 L 215,205 L 235,245 L 205,285 L 160,275 Z', lx: 182, ly: 240, small: false },
  { name: '\u062F\u064A\u0627\u0644\u0649', path: 'M 270,110 L 305,95 L 325,45 L 360,55 L 375,95 L 385,155 L 355,195 L 305,225 L 265,185 L 285,140 Z', lx: 328, ly: 140, small: false },
  { name: '\u0627\u0644\u0623\u0646\u0628\u0627\u0631', path: 'M 15,125 L 65,195 L 120,215 L 160,275 L 150,340 L 120,385 L 70,365 L 15,245 Z', lx: 80, ly: 275, small: false },
  { name: '\u0628\u063A\u062F\u0627\u062F', path: 'M 215,205 L 265,185 L 305,225 L 295,265 L 245,270 L 235,245 Z', lx: 262, ly: 238, small: true },
  { name: '\u0648\u0627\u0633\u0637', path: 'M 305,225 L 355,195 L 385,155 L 415,195 L 425,275 L 395,325 L 345,305 L 295,265 Z', lx: 365, ly: 243, small: false },
  { name: '\u0628\u0627\u0628\u0644', path: 'M 160,275 L 205,285 L 235,245 L 245,270 L 295,265 L 315,305 L 285,350 L 230,355 L 180,335 L 150,340 Z', lx: 232, ly: 308, small: false },
  { name: '\u0643\u0631\u0628\u0644\u0627\u0621', path: 'M 55,365 L 70,365 L 120,385 L 150,340 L 180,335 L 170,385 L 135,415 L 85,405 L 50,395 Z', lx: 118, ly: 388, small: false },
  { name: '\u0627\u0644\u0646\u062C\u0641', path: 'M 50,395 L 85,405 L 135,415 L 170,385 L 180,335 L 230,355 L 220,415 L 165,455 L 95,465 L 40,440 Z', lx: 135, ly: 420, small: false },
  { name: '\u0627\u0644\u0642\u0627\u062F\u0633\u064A\u0629', path: 'M 180,335 L 230,355 L 285,350 L 315,305 L 345,305 L 335,365 L 295,415 L 235,435 L 220,415 L 165,455 Z', lx: 265, ly: 388, small: false },
  { name: '\u0645\u064A\u0633\u0627\u0646', path: 'M 345,305 L 395,325 L 425,275 L 445,315 L 455,395 L 415,445 L 365,435 L 335,365 Z', lx: 398, ly: 368, small: false },
  { name: '\u0627\u0644\u0645\u062B\u0646\u0649', path: 'M 40,440 L 95,465 L 165,455 L 235,435 L 225,495 L 175,535 L 95,545 L 35,510 Z', lx: 132, ly: 493, small: false },
  { name: '\u0630\u064A \u0642\u0627\u0631', path: 'M 235,435 L 295,415 L 335,365 L 365,435 L 415,445 L 405,505 L 355,535 L 285,525 L 225,495 Z', lx: 320, ly: 473, small: false },
  { name: '\u0627\u0644\u0628\u0635\u0631\u0629', path: 'M 95,545 L 175,535 L 225,495 L 285,525 L 355,535 L 405,505 L 455,395 L 475,465 L 465,575 L 405,645 L 325,665 L 225,655 L 130,625 L 60,575 L 35,510 Z', lx: 280, ly: 590, small: false },
];

const FILL_COLORS: Record<string, string> = {
  noData: '#e5e7eb',
  completed: '#d1fae5',
  delayed: '#fef3c7',
  inProgress: '#e0f2fe',
  default: '#f8fafc',
};

const HOVER_FILL_COLORS: Record<string, string> = {
  noData: '#d1d5db',
  completed: '#a7f3d0',
  delayed: '#fde68a',
  inProgress: '#bae6fd',
  default: '#e2e8f0',
};

function getColorKey(s?: GovStats): string {
  if (!s) return 'noData';
  if (s.totalCourses > 0 && s.completed === s.totalCourses) return 'completed';
  if (s.delayed > 0) return 'delayed';
  if (s.inProgress > 0) return 'inProgress';
  return 'default';
}

const IraqMap: React.FC<IraqMapProps> = ({ stats, onGovernorateClick, selectedGovernorate }) => {
  const [hovered, setHovered] = useState<string | null>(null);

  const hoveredGov = GOVERNORATES.find(g => g.name === hovered);
  const hoveredStats = hoveredGov ? stats[hoveredGov.name] : undefined;

  return (
    <div className="w-full max-w-2xl mx-auto" dir="rtl">
      <div className="relative">
        <svg viewBox="0 0 500 700" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
          {GOVERNORATES.map((gov) => {
            const govStats = stats[gov.name];
            const colorKey = getColorKey(govStats);
            const isHovered = hovered === gov.name;
            const isSelected = selectedGovernorate === gov.name;
            const fill = isHovered ? HOVER_FILL_COLORS[colorKey] : FILL_COLORS[colorKey];
            const nameFontSize = gov.small ? 7 : 9.5;
            const statFontSize = gov.small ? 5.5 : 7;
            const statY = gov.ly + nameFontSize * 0.6 + 2;

            return (
              <g key={gov.name}>
                <path
                  d={gov.path}
                  fill={fill}
                  stroke={isSelected ? '#1e40af' : '#94a3b8'}
                  strokeWidth={isSelected ? 2.5 : 1}
                  style={{ transition: 'fill 0.2s, stroke 0.2s, stroke-width 0.2s' }}
                  className="cursor-pointer"
                  onClick={() => onGovernorateClick(gov.name)}
                  onMouseEnter={() => setHovered(gov.name)}
                  onMouseLeave={() => setHovered(null)}
                />
                <text
                  x={gov.lx}
                  y={gov.ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={nameFontSize}
                  fontFamily="Arial, sans-serif"
                  fill="#1e293b"
                  className="pointer-events-none select-none"
                >
                  {gov.name}
                </text>
                {govStats && (
                  <text
                    x={gov.lx}
                    y={statY}
                    textAnchor="middle"
                    dominantBaseline="hanging"
                    fontSize={statFontSize}
                    fontFamily="Arial, sans-serif"
                    fill="#475569"
                    className="pointer-events-none select-none"
                  >
                    {govStats.totalCourses}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {hoveredGov && hoveredStats && (
          <div
            className="absolute bg-white border border-slate-300 rounded-lg shadow-lg p-3 text-sm pointer-events-none z-10 min-w-[150px]"
            style={{
              left: `${(hoveredGov.lx / 500) * 100}%`,
              top: `${(hoveredGov.ly / 700) * 100}%`,
              transform: hoveredGov.ly < 100
                ? 'translate(-50%, 10%)'
                : 'translate(-50%, -110%)',
            }}
            dir="rtl"
          >
            <p className="font-bold text-slate-800 mb-2 border-b border-slate-200 pb-1">{hoveredGov.name}</p>
            <div className="space-y-1 text-slate-600">
              <p>الدورات: {hoveredStats.totalCourses}</p>
              <p>مكتملة: {hoveredStats.completed}</p>
              <p>قيد التنفيذ: {hoveredStats.inProgress}</p>
              <p>متأخرة: {hoveredStats.delayed}</p>
              <p>نسبة الالتزام: {hoveredStats.complianceRate}%</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm border border-slate-300" style={{ backgroundColor: FILL_COLORS.noData }} />
          <span>لا توجد بيانات</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm border border-slate-300" style={{ backgroundColor: FILL_COLORS.completed }} />
          <span>مكتملة</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm border border-slate-300" style={{ backgroundColor: FILL_COLORS.delayed }} />
          <span>متأخرة</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm border border-slate-300" style={{ backgroundColor: FILL_COLORS.inProgress }} />
          <span>قيد التنفيذ</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm border border-slate-300" style={{ backgroundColor: FILL_COLORS.default }} />
          <span>افتراضي</span>
        </div>
      </div>
    </div>
  );
};

export default IraqMap;
