import MedicationChecklist from '../../components/checklist/MedicationChecklist';
import DateNavigation from '../../components/checklist/DateNavigation';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

export default function MedicationChecklistPage() {
  const { groupId } = useParams();
  const [selectedDate, setSelectedDate] = useState(new Date());

  return (
    <section>
      <DateNavigation
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />
      <MedicationChecklist
        checklistId={groupId ?? ''}
        userRole="primary"
      />
    </section>
  );
}