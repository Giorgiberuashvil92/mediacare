#!/bin/bash

echo "🧪 Testing PDF Upload to /upload/identification"
echo ""

# Default values
BASE_URL="${BASE_URL:-http://localhost:4000}"
PDF_FILE="${1:-test_identification.pdf}"

# Check if file exists
if [ ! -f "$PDF_FILE" ]; then
    echo "❌ Error: PDF file '$PDF_FILE' not found!"
    echo ""
    echo "Usage: ./test-pdf-upload.sh [path-to-pdf-file]"
    echo "Example: ./test-pdf-upload.sh ~/Documents/my-id.pdf"
    echo ""
    echo "Creating a test PDF file..."
    
    # Create a simple test PDF file
    echo "%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Test Identification Document) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000306 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
400
%%EOF" > test_identification.pdf
    
    PDF_FILE="test_identification.pdf"
    echo "✅ Created test PDF: $PDF_FILE"
    echo ""
fi

echo "📄 Uploading file: $PDF_FILE"
echo "🌐 Endpoint: $BASE_URL/upload/identification"
echo ""

# Upload the PDF file
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -F "file=@$PDF_FILE" \
    "$BASE_URL/upload/identification")

# Split response and status code (macOS compatible)
# Get the last line (status code)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
# Get everything except the last line (response body)
HTTP_BODY=$(echo "$RESPONSE" | sed '$d')

echo "📤 Response Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Upload successful!"
    echo ""
    echo "📋 Response:"
    echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
    echo ""
    
    # Extract URL if available
    URL=$(echo "$HTTP_BODY" | jq -r '.data.url // .data.filePath // empty' 2>/dev/null)
    if [ -n "$URL" ] && [ "$URL" != "null" ]; then
        echo "🔗 Uploaded file URL: $URL"
        echo ""
        echo "💡 You can test the URL by running:"
        echo "   curl -I \"$URL\""
    fi
else
    echo "❌ Upload failed!"
    echo ""
    echo "📋 Error Response:"
    echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
