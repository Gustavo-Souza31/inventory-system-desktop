import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
    icon: LucideIcon;
    label: string;
    value: string | number;
    color: 'purple' | 'green' | 'yellow' | 'red' | 'blue';
}

export function StatsCard({ icon: Icon, label, value, color }: StatsCardProps) {
    return (
        <div className="stat-card">
            <div className={`stat-card-icon ${color}`}>
                <Icon size={22} />
            </div>
            <div className="stat-card-info">
                <div className="stat-card-label">{label}</div>
                <div className="stat-card-value">{value}</div>
            </div>
        </div>
    );
}
