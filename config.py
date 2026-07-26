from pathlib import Path


PROJECT_FOLDER = Path(__file__).parent
MANUALS_FOLDER = PROJECT_FOLDER / "manuals"
STATE_FILE = PROJECT_FOLDER / "enginecore_state.json"

VECTOR_STORE_NAME = "EngineCore Evidence Repository"
MODEL_NAME = "gpt-5.5"