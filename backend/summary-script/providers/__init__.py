from .repo_provider import RepoProvider

PROVIDERS = {
    "AALTO": RepoProvider("https://aaltodoc.aalto.fi", "AALTO"),
    "HELDA": RepoProvider("https://helda.helsinki.fi", "HELDA"),
    "TREPO": RepoProvider("https://trepo.tuni.fi", "TREPO"),
    "OULUREPO": RepoProvider("https://oulurepo.oulu.fi", "OULUREPO"),
    "LUTPUB": RepoProvider("https://lutpub.lut.fi", "LUTPUB"),
    "THESEUS": RepoProvider("https://www.theseus.fi", "THESEUS"),
}

def get_provider(uni_code=None):
    uni_upper = uni_code.upper() if uni_code else "THESEUS"

    if "/" in uni_upper or uni_upper not in PROVIDERS:
        uni_upper = "THESEUS"

    return PROVIDERS[uni_upper]