/**
 * Utilitários para exportação de conteúdo
 * Suporta: Download local, Email, Google Drive
 */

// Download de texto como arquivo
export const downloadText = (content: string, filename: string, mimeType: string = 'text/plain') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Download como PDF (usando print)
export const downloadAsPDF = (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Elemento não encontrado:', elementId);
    return;
  }
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Não foi possível abrir a janela de impressão');
    return;
  }
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${filename}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          img { max-width: 100%; }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
};

// Enviar por email
export const sendEmail = (subject: string, body: string) => {
  const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoLink;
};

// Salvar no Google Drive (simulado - requer API real)
export const saveToGoogleDrive = async (content: string, filename: string, mimeType: string = 'text/plain') => {
  // Nota: Para usar Google Drive API corretamente, seria necessário:
  // 1. Configurar OAuth 2.0 no Google Cloud Console
  // 2. Carregar a API do Google Drive
  // Esta é uma implementação simulada que copia o conteúdo para a área de transferência
  
  // Copiar para clipboard como fallback
  try {
    await navigator.clipboard.writeText(content);
    alert('Conteúdo copiado para a área de transferência! Você pode colar no Google Drive.');
  } catch (err) {
    console.error('Erro ao copiar:', err);
    // Fallback para download
    downloadText(content, filename, mimeType);
  }
};

// Criar objeto de dados para exportação
export const createExportData = (title: string, content: string, metadata?: Record<string, any>) => {
  return {
    title,
    content,
    exportedAt: new Date().toISOString(),
    ...metadata
  };
};

// Exportar como JSON
export const exportAsJSON = (data: any, filename: string) => {
  const jsonString = JSON.stringify(data, null, 2);
  downloadText(jsonString, filename, 'application/json');
};

// Exportar como Markdown
export const exportAsMarkdown = (title: string, content: string, filename: string) => {
  const markdown = `# ${title}\n\n${content}\n\n---\n*Exportado do Aurea Solaris em ${new Date().toLocaleDateString('pt-BR')}*`;
  downloadText(markdown, filename, 'text/markdown');
};
