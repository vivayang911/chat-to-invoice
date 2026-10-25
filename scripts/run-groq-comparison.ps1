param([string[]]$CaseIds = @('E07','E11','E19','E20'), [switch]$ProbeOnly)
# Reuse the user's existing proxy for this process only; never print proxy credentials.
$previousHttpsProxy = $env:HTTPS_PROXY
$previousNodeProxy = $env:NODE_USE_ENV_PROXY
try {
    if ([string]::IsNullOrWhiteSpace($env:HTTPS_PROXY)) {
        $targetUri = [Uri]'https://api.groq.com/openai/v1/chat/completions'
        $systemProxy = [System.Net.WebRequest]::DefaultWebProxy.GetProxy($targetUri)
        if ($systemProxy.AbsoluteUri -ne $targetUri.AbsoluteUri) { $env:HTTPS_PROXY = $systemProxy.AbsoluteUri }
    }
    if (-not [string]::IsNullOrWhiteSpace($env:HTTPS_PROXY)) { $env:NODE_USE_ENV_PROXY = '1' }
    if ($ProbeOnly) { & node --env-file=work/groq-model.env scripts/groq-model-check.mjs }
    else { & node scripts/compare-free-models.mjs '--provider=groq' @CaseIds }
    $taskExit = $LASTEXITCODE
} finally {
    if ($null -eq $previousHttpsProxy) { Remove-Item Env:HTTPS_PROXY -ErrorAction SilentlyContinue } else { $env:HTTPS_PROXY = $previousHttpsProxy }
    if ($null -eq $previousNodeProxy) { Remove-Item Env:NODE_USE_ENV_PROXY -ErrorAction SilentlyContinue } else { $env:NODE_USE_ENV_PROXY = $previousNodeProxy }
}
if ($taskExit -ne 0) { throw 'Groq probe/comparison failed. Inspect the sanitized report.' }

