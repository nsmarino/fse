<script>
    // @ts-ignore
    const prompt = Avern.Store.prompt
    const config = Avern.Store.config
  
  </script>

{#if $prompt}
  <div class="interaction-prompt">{$prompt} <span class="prompt-input-key"><span>Space</span></span></div>
{/if}

<style>

</style>
  