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

print("=" * 70)
print("ENGINECORE EVIDENCE RETRIEVAL PROTOTYPE")
print("=" * 70)
print(f"Manual found: {manual_path.name}")

# Create a temporary evidence repository for this test.
# Persistent vector-store reuse will be added in the next development step.
vector_store = client.vector_stores.create(
    name="EngineCore First Evidence Test"
)

print("Uploading and indexing the manual...")

with manual_path.open("rb") as manual_file:
    client.vector_stores.files.upload_and_poll(
        vector_store_id=vector_store.id,
        file=manual_file,
    )

print("Manual indexed successfully.")
print("Running EngineCore evidence analysis...\n")

question = """
Using only the uploaded manual, identify:

1. The manual's full title.
2. Its revision number or publication date.
3. One safety-critical requirement stated in the manual.

Do not use outside knowledge.
Do not guess or fill gaps with assumptions.

Return the answer using exactly this format:

ENGINECORE RESPONSE

DIRECT ANSWER
Provide a concise answer to each requested item.

EVIDENCE
For every conclusion, provide:
- The conclusion being supported.
- The uploaded document's filename.
- The page number, section, heading, or other location when available.
- A concise description of the supporting passage.

CONFIDENCE
Assign one confidence level to each conclusion:
- HIGH: directly and clearly stated in the evidence.
- MEDIUM: supported by the evidence but requires limited interpretation.
- LOW: incomplete, ambiguous, or only indirectly supported.

UNVERIFIED OR MISSING INFORMATION
Clearly identify anything that cannot be verified from the uploaded document.

EVIDENCE BOUNDARY
State whether the response relied exclusively on the uploaded document.
"""

response = client.responses.create(
    model="gpt-5.5",
    input=question,
    tools=[
        {
            "type": "file_search",
            "vector_store_ids": [vector_store.id],
        }
    ],
)

print(response.output_text)

print("\n" + "=" * 70)
print("END ENGINECORE RESPONSE")
print("=" * 70)