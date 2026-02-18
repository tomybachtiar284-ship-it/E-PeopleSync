/**
 * Digital Receipt PDF Generation Logic
 * Uses html2pdf.js to create a formal document
 */

function generateReceiptPDF(requestId) {
    const data = getData();
    const req = (data.leaveRequests || []).find(r => r.id === requestId);

    if (!req) {
        alert("Data pengajuan tidak ditemukan.");
        return;
    }

    if (req.status !== 'Approved') {
        alert("Resi hanya tersedia untuk pengajuan yang sudah disetujui (Approved).");
        return;
    }

    // Prepare Terminology
    const tlNode = (req.approvalHistory || []).find(h => h.role === 'supervisor') || { action: 'Approved', time: req.submittedAt };
    const asmanNode = (req.approvalHistory || []).find(h => h.role === 'asman' || h.role === 'manager') || { action: 'Approved', time: req.approvedAt };

    // Switch to DIRECT jsPDF rendering (Atomic stability, no blank canvas issues)
    const jsPDFLib = window.jspdf ? window.jspdf.jsPDF : (window.jsPDF ? window.jsPDF : null);

    if (!jsPDFLib) {
        alert("Sistem PDF tidak siap. Silakan refresh halaman.");
        return;
    }

    // Show simple loading
    const loader = document.createElement('div');
    loader.style = "position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:#000; color:#fff; padding:20px 40px; border-radius:10px; z-index:100000; font-family:sans-serif;";
    loader.innerHTML = "Membuat Laporan PDF...";
    document.body.appendChild(loader);

    try {
        const doc = new jsPDFLib({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        // Header Style (Excel-ish)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("LAPORAN PENGAJUAN CUTI / IZIN", 105, 20, { align: "center" });

        doc.setLineWidth(0.5);
        doc.line(15, 25, 195, 25);

        // Body Content
        doc.setFontSize(11);
        let y = 40;
        const xLabel = 20;
        const xValue = 70;
        const lineH = 10;

        const fields = [
            ["ID Pengajuan", `REQ-${req.id}`],
            ["Nama Karyawan", req.empName || req.name || "-"],
            ["NID Karyawan", req.empId || "-"],
            ["Jenis Pengajuan", (req.type || "CUTI").toUpperCase()],
            ["Mulai Tanggal", req.startDate || req.dateStart || "-"],
            ["Sampai Tanggal", req.endDate || req.dateEnd || "-"],
            ["Status", "DISESTUJUI (APPROVED)"]
        ];

        fields.forEach(field => {
            doc.setFont("helvetica", "bold");
            doc.text(field[0], xLabel, y);
            doc.setFont("helvetica", "normal");
            doc.text(": " + field[1], xValue, y);
            y += lineH;
        });

        // Reason Field (with wrapping)
        doc.setFont("helvetica", "bold");
        doc.text("Alasan / Keperluan", xLabel, y);
        doc.setFont("helvetica", "normal");
        const reason = req.reason || "-";
        const splitReason = doc.splitTextToSize(reason, 120);
        doc.text(":", xValue, y);
        doc.text(splitReason, xValue + 3, y);

        y += (splitReason.length * 6) + 15;

        // Simple Border Box (The "Excel" look)
        doc.setLineWidth(0.2);
        doc.rect(15, 33, 180, y - 25);

        // Footer
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(`Dicetak melalui E-PEOPLESYNC pada: ${new Date().toLocaleString('id-ID')}`, 15, 285);

        // Save
        const fileName = `Laporan_Cuti_${(req.empName || 'User').replace(/\s+/g, '_')}.pdf`;
        doc.save(fileName);

    } catch (err) {
        console.error("PDF Fatal Error:", err);
        alert("Gagal membuat PDF: " + err.message);
    } finally {
        document.body.removeChild(loader);
    }
}
