// CC-135: PDF Document Generation & Formatting
// Renders hospital summary as professional medical PDF with watermark & disclaimer

import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { HospitalSummaryData } from './hospital-summary.service';

@Injectable()
export class PDFGenerationService {
  private readonly WATERMARK_TEXT = 'PLEASE VERIFY BEFORE SHARING WITH MEDICAL STAFF';
  private readonly MEDICAL_DISCLAIMER =
    'This information is based on recorded care profile and is not medical advice. Always consult a qualified healthcare professional before making medical decisions.';
  private readonly PAGE_WIDTH = 612; // Letter size
  private readonly PAGE_HEIGHT = 792;
  private readonly MARGIN = 40;

  /**
   * Generate professional PDF from hospital summary data
   * Returns a Buffer containing the PDF document
   */
  async generateHospitalSummaryPDF(summaryData: HospitalSummaryData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'letter',
          margin: this.MARGIN,
          bufferPages: true,
        });

        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          resolve(Buffer.concat(chunks));
        });

        // Build PDF content
        this.addHeader(doc, summaryData);
        this.addPatientDetails(doc, summaryData);
        this.addMedications(doc, summaryData);
        this.addConditions(doc, summaryData);
        this.addAllergies(doc, summaryData);
        this.addGPContacts(doc, summaryData);
        this.addCareNotes(doc, summaryData);
        this.addFlaggedPatterns(doc, summaryData);

        // Add watermark and footer to all pages
        this.addWatermarkAndFooter(doc);

        doc.end();
      } catch (error) {
        reject(new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
  }

  // ========================================================================
  // Helper: ensure enough space on page
  // ========================================================================

  private ensureSpace(doc: any, neededLines: number = 5): void {
    // Estimate ~16pt per line, plus small buffer; leave 80pt for footer
    const neededHeight = neededLines * 16;
    if (doc.y + neededHeight > this.PAGE_HEIGHT - 80) {
      doc.addPage();
    }
  }

  // ========================================================================
  // PDF Building Methods
  // ========================================================================

  private addHeader(doc: any, data: HospitalSummaryData) {
    const titleX = this.MARGIN;
    const titleY = this.MARGIN;

    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('HOSPITAL VISIT SUMMARY', titleX, titleY);

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(
        `Generated: ${new Date(data.generatedAt).toLocaleString()}`,
        titleX,
        titleY + 35
      );

    doc
      .moveTo(this.MARGIN, titleY + 55)
      .lineTo(this.PAGE_WIDTH - this.MARGIN, titleY + 55)
      .stroke();

    doc.moveDown(2);
  }

  private addPatientDetails(doc: any, data: HospitalSummaryData) {
    this.addSectionTitle(doc, 'PATIENT DETAILS');

    const details = [
      { label: 'Full Name:', value: data.fullName },
      { label: 'Date of Birth:', value: data.dateOfBirth },
    ];

    this.addDetailRows(doc, details);
  }

  private addMedications(doc: any, data: HospitalSummaryData) {
    this.addSectionTitle(doc, 'CURRENT MEDICATIONS');

    if (data.medications.length === 0) {
      doc.fontSize(11).font('Helvetica').text('No medications recorded.', {
        indent: 20,
      });
      doc.moveDown();
      return;
    }

    for (let idx = 0; idx < data.medications.length; idx++) {
      const med = data.medications[idx];
      this.ensureSpace(doc, 4); // medication line + two details lines + spacing
      const medText = `${idx + 1}. ${med.name} ${med.dose}${med.unit}, ${med.frequency}`;
      const startDateText = `Started: ${med.startDate}`;
      const lastGivenText = med.lastGivenTimestamp
        ? `Last given: ${new Date(med.lastGivenTimestamp).toLocaleDateString()}`
        : 'Last given: Not recorded';

      doc.fontSize(11).font('Helvetica-Bold').text(medText, { indent: 20 });
      doc.fontSize(10).font('Helvetica').text(startDateText, { indent: 40 });
      doc.fontSize(10).font('Helvetica').text(lastGivenText, { indent: 40 });
      doc.moveDown(0.5);
    }

    doc.moveDown();
  }

  private addConditions(doc: any, data: HospitalSummaryData) {
    this.addSectionTitle(doc, 'MEDICAL CONDITIONS');

    if (data.conditions.length === 0) {
      doc.fontSize(11).font('Helvetica').text('No conditions recorded.', {
        indent: 20,
      });
      doc.moveDown();
      return;
    }

    data.conditions.forEach((condition, idx) => {
      this.ensureSpace(doc, 1);
      doc
        .fontSize(11)
        .font('Helvetica')
        .text(`${idx + 1}. ${condition}`, { indent: 20 });
    });

    doc.moveDown();
  }

  private addAllergies(doc: any, data: HospitalSummaryData) {
    this.addSectionTitle(doc, 'ALLERGIES');

    if (data.allergies.length === 0) {
      doc.fontSize(11).font('Helvetica').text('No allergies recorded.', {
        indent: 20,
      });
      doc.moveDown();
      return;
    }

    data.allergies.forEach((allergy, idx) => {
      this.ensureSpace(doc, 1);
      doc
        .fontSize(11)
        .font('Helvetica')
        .text(`${idx + 1}. ${allergy}`, { indent: 20 });
    });

    doc.moveDown();
  }

  private addGPContacts(doc: any, data: HospitalSummaryData) {
    this.addSectionTitle(doc, 'GP CONTACTS');

    if (data.gpContacts.length === 0) {
      doc.fontSize(11).font('Helvetica').text('No GP contacts recorded.', {
        indent: 20,
      });
      doc.moveDown();
      return;
    }

    for (const gp of data.gpContacts) {
      this.ensureSpace(doc, 3);
      const gpName = `${gp.name} (${gp.specialty})`;
      doc.fontSize(11).font('Helvetica-Bold').text(gpName, { indent: 20 });

      if (gp.phone) {
        doc.fontSize(10).font('Helvetica').text(`Phone: ${gp.phone}`, {
          indent: 40,
        });
      }
      if (gp.email) {
        doc.fontSize(10).font('Helvetica').text(`Email: ${gp.email}`, {
          indent: 40,
        });
      }
      if (gp.address) {
        doc.fontSize(10).font('Helvetica').text(`Address: ${gp.address}`, {
          indent: 40,
        });
      }
      doc.moveDown(0.5);
    }

    doc.moveDown();
  }

  private addCareNotes(doc: any, data: HospitalSummaryData) {
    this.addSectionTitle(doc, '7-DAY CARE NOTES SUMMARY');

    if (data.careNotesSummary.length === 0) {
      doc.fontSize(11).font('Helvetica').text('No recent care notes.', { indent: 20 });
      doc.moveDown();
      return;
    }

    for (const note of data.careNotesSummary) {
      this.ensureSpace(doc, 3); // date line + content (~2 lines) + spacing
      doc.fontSize(11).font('Helvetica-Bold').text(note.date, { indent: 20 });
      doc.fontSize(10).font('Helvetica').text(note.content, {
        indent: 40,
        width: this.PAGE_WIDTH - 2 * this.MARGIN - 40,
      });
      doc.moveDown(0.5);
    }
    doc.moveDown();
  }

  private addFlaggedPatterns(doc: any, data: HospitalSummaryData) {
    if (data.flaggedPatterns.length === 0) return;

    this.ensureSpace(doc, 3); // ensure space for title + at least one pattern
    this.addSectionTitle(doc, 'FLAGGED PATTERNS');

    for (const pattern of data.flaggedPatterns) {
      this.ensureSpace(doc, 2); // pattern label + observation line
      const severityColor = this.getSeverityColor(pattern.severity);
      const patternLabel = `[${pattern.severity.toUpperCase()}] ${pattern.type}`;
      doc.fontSize(11).font('Helvetica-Bold').fillColor(severityColor).text(patternLabel, {
        indent: 20,
      });
      doc
        .fillColor('black')
        .fontSize(10)
        .font('Helvetica')
        .text(pattern.observation, {
          indent: 40,
          width: this.PAGE_WIDTH - 2 * this.MARGIN - 40,
        });
      doc.moveDown(0.5);
    }
    doc.moveDown();
  }

  private addWatermarkAndFooter(doc: any) {
    const pages = doc.bufferedPageRange().count;

    for (let i = 0; i < pages; i++) {
      doc.switchToPage(i);

      // Watermark
      doc
        .opacity(0.1)
        .fontSize(60)
        .font('Helvetica-Bold')
        .rotate(45, {
          origin: [this.PAGE_WIDTH / 2, this.PAGE_HEIGHT / 2],
        })
        .text(this.WATERMARK_TEXT, 0, this.PAGE_HEIGHT / 2 - 100, {
          align: 'center',
          width: this.PAGE_WIDTH * 1.5,
        })
        .rotate(-45, {
          origin: [this.PAGE_WIDTH / 2, this.PAGE_HEIGHT / 2],
        });

      doc.opacity(1);

      // Footer line
      const footerY = this.PAGE_HEIGHT - 60;
      doc
        .moveTo(this.MARGIN, footerY - 10)
        .lineTo(this.PAGE_WIDTH - this.MARGIN, footerY - 10)
        .stroke();

      // Disclaimer text
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('black')
        .text(this.MEDICAL_DISCLAIMER, this.MARGIN, footerY, {
          width: this.PAGE_WIDTH - 2 * this.MARGIN,
          align: 'left',
        });

      // Page number
      doc
        .fontSize(9)
        .text(`Page ${i + 1} of ${pages}`, this.MARGIN, this.PAGE_HEIGHT - 20, {
          align: 'center',
          width: this.PAGE_WIDTH - 2 * this.MARGIN,
        });
    }
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private addSectionTitle(doc: any, title: string) {
    // If there isn't enough room for the title line + at least one content line, add a new page
    if (doc.y > this.PAGE_HEIGHT - 80) {
      doc.addPage();
    }
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('black')
      .text(title);
    doc
      .moveTo(this.MARGIN, doc.y)
      .lineTo(this.PAGE_WIDTH - this.MARGIN, doc.y)
      .stroke();
    doc.moveDown(0.5);
  }

  private addDetailRows(doc: any, details: Array<{ label: string; value: string }>) {
    const labelWidth = 120;
    const startX = this.MARGIN + 20;

    for (const detail of details) {
      this.ensureSpace(doc, 2);
      const labelX = startX;
      const valueX = startX + labelWidth;

      doc.fontSize(11).font('Helvetica-Bold').text(detail.label, labelX, doc.y, {
        width: labelWidth,
        align: 'left',
      });

      doc
        .fontSize(11)
        .font('Helvetica')
        .text(detail.value, valueX, doc.y - 16, {
          width: this.PAGE_WIDTH - valueX - this.MARGIN,
          align: 'left',
        });

      doc.moveDown(1.5);
    }

    doc.moveDown(0.5);
  }

  private getSeverityColor(severity: string): string {
    switch (severity.toLowerCase()) {
      case 'high':
        return '#d32f2f';
      case 'medium':
        return '#f57c00';
      case 'low':
        return '#388e3c';
      default:
        return '#000000';
    }
  }
}

export default PDFGenerationService;