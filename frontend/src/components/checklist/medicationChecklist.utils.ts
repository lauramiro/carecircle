import type { ChecklistItem } from '@lib/checklist';

export function groupItemsByWindow(items: ChecklistItem[]): Record<string, ChecklistItem[]> {
  const groups: Record<string, ChecklistItem[]> = {
    morning: [],
    afternoon: [],
    evening: [],
    night: [],
  };

  items.forEach((item) => {
    const hour = parseInt(item.time_window.time_of_day.split(':')[0]);
    if (hour <= 11) groups.morning.push(item);
    else if (hour <= 17) groups.afternoon.push(item);
    else if (hour <= 20) groups.evening.push(item);
    else groups.night.push(item);
  });

  return groups;
}
