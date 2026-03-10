import sys
import pypdf

def extract_pdf_to_file(pdf_path, output_path):
    try:
        reader = pypdf.PdfReader(pdf_path)
        with open(output_path, "w", encoding="utf-8") as f:
            for i, page in enumerate(reader.pages):
                f.write(f"\n--- Page {i+1} ---\n")
                f.write(page.extract_text() + "\n")
        print(f"Successfully extracted to {output_path}")
    except Exception as e:
        print(f"Error reading {pdf_path}: {e}")

if __name__ == "__main__":
    extract_pdf_to_file(r"C:\Users\vivic\Downloads\Otimização de Dashboard Multiagente Pessoal (2).pdf", r"C:\AureaSolaris\pdf1.txt")
    extract_pdf_to_file(r"C:\Users\vivic\Downloads\multiagentes_protocolo.pdf", r"C:\AureaSolaris\pdf2.txt")
