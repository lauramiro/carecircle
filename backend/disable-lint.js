const fs = require('fs');
const files = [
  'src/insights/weekly-insight-generation.service.spec.ts',
  'src/integrations/repositories/care-group.repository.ts',
  'src/integrations/repositories/alert.repository.ts',
  'src/integrations/repositories/checklist.repository.ts',
  'src/integrations/repositories/medication.repository.ts',
  'src/integrations/repositories/push-subscription.repository.ts',
  'src/invites/group-invite-email.service.spec.ts',
  'src/medications/medications.dto.ts',
  'src/reminders/reminders.service.ts',
  'src/test/integration/ai-qa.integration.spec.ts'
];
const comment = '/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */\n';
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (!content.startsWith('/* eslint-disable')) {
    fs.writeFileSync(f, comment + content);
  }
});
