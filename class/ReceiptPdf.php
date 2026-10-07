<?php
require_once __DIR__ . '/../lib/fpdf/fpdf.php';

/**
 * Payment receipt PDF for one paymenttransaction row.
 * Used as the WhatsApp document header and as the payment email attachment.
 */
class ReceiptPdf {

    const GYM_NAME    = 'PRO GYM';
    const GYM_ADDRESS = 'Kalamba Rd, Dadu Chougule Nagar, Survey Nagar, Kolhapur, Maharashtra 416007';
    const GYM_PHONE   = '+91 8796655176';
    const GYM_WEB     = 'progym.co.in';

    private static $cache = [];

    /** Receipt details for a transaction; null if not found. Balance is as it stood right after this payment. */
    public static function data($db, $txnId) {
        $s = $db->prepare(
            "SELECT t.id, t.packageDetailsId, t.feesPaid, IFNULL(t.proCoinsUsed, 0) AS proCoinsUsed,
                    t.paymentDate, t.paymentMode,
                    pd.clientId, pd.fees, pd.startDate, pd.endDate, c.name, c.mobile,
                    COALESCE(NULLIF(p.description,''), pd.description, 'Package') AS packageName
             FROM paymenttransaction t
             JOIN packagedetails pd ON pd.id = t.packageDetailsId
             JOIN client c ON c.id = pd.clientId
             LEFT JOIN packages p ON p.id = pd.packageId
             WHERE t.id = ? LIMIT 1"
        );
        $s->execute([intval($txnId)]);
        $t = $s->fetch(PDO::FETCH_ASSOC);
        if (!$t) return null;

        $s = $db->prepare(
            "SELECT COALESCE(SUM(feesPaid + IFNULL(proCoinsUsed, 0)), 0) FROM paymenttransaction
             WHERE packageDetailsId = ? AND discontinue = 'false' AND id < ?"
        );
        $s->execute([$t['packageDetailsId'], $t['id']]);
        $t['paidBefore'] = floatval($s->fetchColumn());
        $t['paidNow']    = floatval($t['feesPaid']) + floatval($t['proCoinsUsed']);
        $t['balance']    = max(0, floatval($t['fees']) - $t['paidBefore'] - $t['paidNow']);
        $t['receiptNo']  = 'PG-' . str_pad($t['id'], 6, '0', STR_PAD_LEFT);
        return $t;
    }

    public static function filename($txnId) {
        return 'ProGym_Receipt_PG-' . str_pad(intval($txnId), 6, '0', STR_PAD_LEFT) . '.pdf';
    }

    /** PDF bytes for a transaction, or null on failure. Never throws. */
    public static function build($db, $txnId) {
        $txnId = intval($txnId);
        if (isset(self::$cache[$txnId])) return self::$cache[$txnId];
        try {
            $t = self::data($db, $txnId);
            if (!$t) return null;
            return self::$cache[$txnId] = self::render($t);
        } catch (Throwable $e) {
            error_log('ReceiptPdf error: ' . $e->getMessage());
            return null;
        }
    }

    private static function txt($s) {
        $s = (string)$s;
        $out = @iconv('UTF-8', 'windows-1252//TRANSLIT', $s);
        return $out === false ? preg_replace('/[^\x20-\x7E]/', '?', $s) : $out;
    }

    private static function rs($n) {
        return 'Rs. ' . number_format(floatval($n), 2);
    }

    private static function render(array $t) {
        $pdf = new FPDF('P', 'mm', 'A4');
        $pdf->SetMargins(15, 15, 15);
        $pdf->SetAutoPageBreak(false);
        $pdf->AddPage();
        $pdf->SetTitle('Payment Receipt ' . $t['receiptNo']);
        $pdf->SetAuthor(self::GYM_NAME);

        $W = 180; // printable width

        // ── Header bar ──
        $pdf->SetFillColor(15, 23, 42);
        $pdf->Rect(0, 0, 210, 40, 'F');
        $logo = __DIR__ . '/assets/receipt_logo.jpg';
        if (is_readable($logo)) $pdf->Image($logo, 15, 7, 26, 26);
        $pdf->SetTextColor(255, 255, 255);
        $pdf->SetFont('Helvetica', 'B', 22);
        $pdf->SetXY(45, 11);
        $pdf->Cell(80, 9, self::GYM_NAME);
        $pdf->SetFont('Helvetica', '', 10);
        $pdf->SetTextColor(148, 163, 184);
        $pdf->SetXY(45, 21);
        $pdf->Cell(80, 6, 'Kolhapur');

        $pdf->SetTextColor(255, 255, 255);
        $pdf->SetFont('Helvetica', 'B', 15);
        $pdf->SetXY(110, 10);
        $pdf->Cell(85, 8, 'PAYMENT RECEIPT', 0, 2, 'R');
        $pdf->SetFont('Helvetica', '', 10);
        $pdf->SetTextColor(203, 213, 225);
        $pdf->Cell(85, 6, 'Receipt No: ' . $t['receiptNo'], 0, 2, 'R');
        $pdf->Cell(85, 6, 'Date: ' . self::txt($t['paymentDate']), 0, 2, 'R');

        // ── Gym contact line ──
        $pdf->SetTextColor(100, 116, 139);
        $pdf->SetFont('Helvetica', '', 9);
        $pdf->SetXY(15, 44);
        $pdf->Cell($W, 5, self::txt(self::GYM_ADDRESS), 0, 2, 'C');
        $pdf->Cell($W, 5, 'Phone: ' . self::GYM_PHONE . '   |   ' . self::GYM_WEB, 0, 2, 'C');
        $pdf->SetDrawColor(226, 232, 240);
        $pdf->Line(15, 57, 195, 57);

        // ── Billed to ──
        $y = 63;
        $pdf->SetXY(15, $y);
        $pdf->SetFont('Helvetica', 'B', 8);
        $pdf->SetTextColor(148, 163, 184);
        $pdf->Cell(90, 5, 'RECEIVED FROM', 0, 0);
        $pdf->Cell(90, 5, 'PAYMENT', 0, 1, 'R');

        $pdf->SetFont('Helvetica', 'B', 13);
        $pdf->SetTextColor(15, 23, 42);
        $pdf->Cell(110, 7, self::txt($t['name']), 0, 0);
        $pdf->SetFont('Helvetica', '', 10);
        $pdf->Cell(70, 7, 'Mode: ' . self::txt($t['paymentMode'] ?: '-'), 0, 1, 'R');

        $pdf->SetFont('Helvetica', '', 10);
        $pdf->SetTextColor(71, 85, 105);
        $pdf->Cell(110, 6, 'Member ID: ' . $t['clientId'] . '     Mobile: ' . self::txt($t['mobile']), 0, 0);
        if (floatval($t['proCoinsUsed']) > 0) {
            $pdf->Cell(70, 6, 'ProCoins used: ' . number_format(floatval($t['proCoinsUsed']), 0), 0, 1, 'R');
        } else {
            $pdf->Ln(6);
        }

        // ── Package table ──
        $y = 92;
        $pdf->SetXY(15, $y);
        $pdf->SetFillColor(248, 250, 252);
        $pdf->SetFont('Helvetica', 'B', 9);
        $pdf->SetTextColor(100, 116, 139);
        $pdf->Cell(85, 9, '  PACKAGE', 'TB', 0, 'L', true);
        $pdf->Cell(55, 9, 'PERIOD', 'TB', 0, 'L', true);
        $pdf->Cell(40, 9, 'FEES  ', 'TB', 1, 'R', true);

        $pdf->SetFont('Helvetica', '', 10);
        $pdf->SetTextColor(15, 23, 42);
        $pdf->Cell(85, 11, '  ' . self::txt($t['packageName']), 'B', 0, 'L');
        $pdf->Cell(55, 11, self::txt($t['startDate'] . ' - ' . $t['endDate']), 'B', 0, 'L');
        $pdf->Cell(40, 11, self::rs($t['fees']) . '  ', 'B', 1, 'R');

        // ── Totals ──
        $rows = [
            ['Package fees',     self::rs($t['fees'])],
            ['Paid earlier',     self::rs($t['paidBefore'])],
        ];
        $pdf->SetY($pdf->GetY() + 5);
        foreach ($rows as $r) {
            $pdf->SetX(105);
            $pdf->SetFont('Helvetica', '', 10);
            $pdf->SetTextColor(100, 116, 139);
            $pdf->Cell(50, 7, $r[0], 0, 0, 'L');
            $pdf->SetTextColor(15, 23, 42);
            $pdf->Cell(40, 7, $r[1] . '  ', 0, 1, 'R');
        }

        // Paid now — highlighted
        $pdf->SetX(105);
        $pdf->SetFillColor(255, 247, 237);
        $pdf->SetDrawColor(254, 215, 170);
        $pdf->SetFont('Helvetica', 'B', 11);
        $pdf->SetTextColor(154, 52, 18);
        $pdf->Cell(50, 10, '  Amount received', 'TBL', 0, 'L', true);
        $pdf->SetTextColor(234, 88, 12);
        $pdf->Cell(40, 10, self::rs($t['paidNow']) . '  ', 'TBR', 1, 'R', true);

        $pdf->SetX(105);
        $pdf->SetFont('Helvetica', 'B', 10);
        $pdf->SetTextColor(100, 116, 139);
        $pdf->Cell(50, 8, 'Balance due', 0, 0, 'L');
        if ($t['balance'] <= 0) $pdf->SetTextColor(21, 128, 61); else $pdf->SetTextColor(220, 38, 38);
        $pdf->Cell(40, 8, ($t['balance'] <= 0 ? 'Nil (Fully paid)' : self::rs($t['balance'])) . '  ', 0, 1, 'R');

        // ── PAID stamp ──
        $pdf->SetDrawColor(22, 163, 74);
        $pdf->SetLineWidth(0.8);
        $pdf->SetTextColor(22, 163, 74);
        $pdf->SetFont('Helvetica', 'B', 18);
        $pdf->SetXY(25, 122);
        $pdf->Cell(42, 14, 'PAID', 1, 0, 'C');
        $pdf->SetLineWidth(0.2);

        // ── Footer ──
        $pdf->SetDrawColor(226, 232, 240);
        $pdf->Line(15, 172, 195, 172);
        $pdf->SetXY(15, 176);
        $pdf->SetFont('Helvetica', 'B', 11);
        $pdf->SetTextColor(15, 23, 42);
        $pdf->Cell($W, 6, 'Thank you for training with PRO GYM!', 0, 2, 'C');
        $pdf->SetFont('Helvetica', '', 9);
        $pdf->SetTextColor(100, 116, 139);
        $pdf->Cell($W, 5, 'Track your workouts, diet & attendance at https://progym.co.in', 0, 2, 'C');
        $pdf->SetFont('Helvetica', 'I', 8);
        $pdf->SetTextColor(148, 163, 184);
        $pdf->Cell($W, 8, 'This is a computer-generated receipt and does not require a signature.', 0, 2, 'C');

        return $pdf->Output('S');
    }
}
