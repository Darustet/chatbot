from . import aalto_provider
from . import theseus_provider

# Provider map: university code -> provider module
PROVIDER_MAP = {
    'AALTO': aalto_provider,
    'THESEUS': theseus_provider,
}

# Get the appropriate provider module for a university code. 
# Args: uni_code: University code string (e.g., 'AALTO', 'THESEUS')
# Returns: Provider module with summarize() function
def get_provider(uni_code):
    if uni_code:
        uni_upper = uni_code.upper()
    else:
        uni_upper = "THESEUS" # Default to THESEUS if no code provided
    # Look up the provider map, returns the matching provider module. Defaults to theseus_provider if code is unrecognized.
    return PROVIDER_MAP.get(uni_upper, theseus_provider)

__all__ = ['aalto_provider', 'theseus_provider', 'get_provider']