/**
 * Digital Receipt PDF Generation Logic
 * Uses html2pdf.js to create a formal document
 */

const API = 'http://localhost:3001';

async function generateReceiptPDF(requestId) {
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

    let req = null;
    try {
        const res = await fetch(`${API}/api/leave/${requestId}`);
        if (!res.ok) {
            document.body.removeChild(loader);
            alert("Data pengajuan tidak ditemukan.");
            return;
        }
        req = await res.json();

        if (req.status !== 'Approved') {
            document.body.removeChild(loader);
            alert("Resi hanya tersedia untuk pengajuan yang sudah disetujui (Approved).");
            return;
        }

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
            ["Nama Karyawan", req.emp_name || req.name || "-"],
            ["NID Karyawan", req.user_id || "-"],
            ["Jenis Pengajuan", (req.type || "CUTI").toUpperCase()],
            ["Mulai Tanggal", req.start_date || "-"],
            ["Sampai Tanggal", req.end_date || "-"],
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
        const fileName = `Laporan_Cuti_${(req.emp_name || req.name || 'User').replace(/\\s+/g, '_')}.pdf`;
        doc.save(fileName);

    } catch (err) {
        console.error("PDF Fatal Error:", err);
        alert("Gagal membuat PDF: " + err.message);
    } finally {
        if (document.body.contains(loader)) {
            document.body.removeChild(loader);
        }
    }
}
