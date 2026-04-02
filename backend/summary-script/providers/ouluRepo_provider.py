from . non_api_repo_provider import RepoProvider

_provider = RepoProvider(
    base_url="https://oulurepo.oulu.fi",
    repo_name="OULUREPO",
)

summarize = _provider.summarize
extract_abstract_from_page = _provider.extract_abstract_from_page