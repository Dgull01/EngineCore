from pathlib import Path

from openai import OpenAI


MANUALS_FOLDER = Path(__file__).parent / "manuals"

client = OpenAI()

# Find the first PDF in the manuals folder.
pdf_files = list(MANUALS_FOLDER.glob("*.pdf"))

if not pdf_files:
    raise FileNotFoundError(
        f"No PDF found in: {MANUALS_FOLDER}\n"
        "Copy one manual into that folder and run the program again."
    )

manual_path = pdf_files[0]
print(f"Manual found: {manual_path.name}")

# Create EngineCore's first evidence repository.
vector_store = client.vector_stores.create(
    name="EngineCore First Evidence Test"
)

print("Uploading and indexing the manual...")

client.vector_stores.files.upload_and_poll(
    vector_store_id=vector_store.id,
    file=manual_path.open("rb"),
)

print("Manual indexed successfully.")
print("Asking EngineCore its first evidence-based question...\n")

response = client.responses.create(
    model="gpt-5.5",
    input="""
Using only the uploaded manual, identify:

1. The manual's full title.
2. Its revision number or publication date.
3. One safety-critical requirement stated in the manual.

For every conclusion:
- Cite the uploaded document by filename.
- Identify the section or page when available.
- Do not use outside knowledge.
- Do not guess.
- Clearly state anything that cannot be verified from the document.
""",
    tools=[
        {
            "type": "file_search",
            "vector_store_ids": [vector_store.id],
        }
    ],
)

print(response.output_text)