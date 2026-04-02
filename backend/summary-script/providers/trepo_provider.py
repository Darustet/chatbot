from . non_api_repo_provider import RepoProvider

_provider = RepoProvider(
    base_url="https://trepo.tuni.fi",
    repo_name="TREPO",
)

summarize = _provider.summarize
extract_abstract_from_page = _provider.extract_abstract_from_page