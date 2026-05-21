export function parseDosageString(dosage: string): { dose: number; unit: string } {
  const match = dosage.trim().match(/^([\d.]+)\s+(\S+)$/);
  if (!match) {
    throw new Error(`Invalid dosage format: "${dosage}". Expected e.g. "10 mg".`);
  }
  return { dose: Number(match[1]), unit: match[2] };
}
