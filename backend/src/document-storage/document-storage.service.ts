import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseAdminClient } from '../integrations/supabase-admin.client';

const DOCUMENT_STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024;

export interface DocumentStorageUsage {
  usedBytes: number;
  limitBytes: number;
  usageRatio: number;
  warningThresholdRatio: number;
  isWarning: boolean;
}

type DocumentFileSizeRow = {
  file_size: number | null;
};

@Injectable()
export class DocumentStorageService {
  constructor(private readonly supabase: SupabaseAdminClient) {}

  async getGroupStorageUsage(groupId: string, accessToken: string): Promise<DocumentStorageUsage> {
    if (!this.supabase.isEnabled()) {
      throw new ServiceUnavailableException('Document storage usage is not available right now.');
    }

    const client = this.supabase.getClient();
    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser(accessToken);

    if (userError || !user) {
      throw new UnauthorizedException('You must be signed in to view document storage usage.');
    }

    const { data: membership, error: membershipError } = await client
      .from('care_givers')
      .select('id')
      .eq('group_id', groupId)
      .eq('caregiver_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (membershipError) {
      throw new ServiceUnavailableException('Unable to verify care circle access right now.');
    }

    if (!membership) {
      throw new ForbiddenException('You do not have access to this care circle.');
    }

    const { data: patient, error: patientError } = await client
      .from('patients')
      .select('id')
      .eq('group_id', groupId)
      .maybeSingle();

    if (patientError) {
      throw new ServiceUnavailableException('Unable to resolve the patient for this care circle.');
    }

    if (!patient?.id) {
      return this.buildUsageResponse(0);
    }

    const { data: documentRows, error: documentsError } = await client
      .from('documents')
      .select('file_size')
      .eq('patient_id', patient.id);

    if (documentsError) {
      throw new ServiceUnavailableException('Unable to load document storage usage right now.');
    }

    const usedBytes = ((documentRows ?? []) as DocumentFileSizeRow[]).reduce(
      (total, row) => total + Math.max(0, row.file_size ?? 0),
      0,
    );

    return this.buildUsageResponse(usedBytes);
  }

  private buildUsageResponse(usedBytes: number): DocumentStorageUsage {
    const usageRatio = usedBytes / DOCUMENT_STORAGE_LIMIT_BYTES;
    const warningThresholdRatio = 0.8;

    return {
      usedBytes,
      limitBytes: DOCUMENT_STORAGE_LIMIT_BYTES,
      usageRatio,
      warningThresholdRatio,
      isWarning: usageRatio >= warningThresholdRatio,
    };
  }
}