from app.services.model_router import ModelRouter


def test_light_for_simple_prompt():
    router = ModelRouter()
    d = router.route("Un elfe entre dans la forêt.")
    assert d.tier == "light"
    assert d.model.startswith("qwen")


def test_heavy_for_dramatic_prompt():
    router = ModelRouter()
    d = router.route("Écris le chapitre final avec un twist dramatique.")
    assert d.tier == "heavy"
    assert d.model.startswith("llama")


def test_heavy_for_long_prompt():
    router = ModelRouter()
    d = router.route("a" * 401)
    assert d.tier == "heavy"