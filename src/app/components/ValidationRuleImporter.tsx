import { Component, createSignal, Show } from 'solid-js';
import { profileStore } from '../stores/profileStore';
import { parseJsonSchema, validateJsonSchema } from '../utils/importJsonSchema';
import { parseSodaYaml } from '../utils/importSodaChecks';
import { validateSodaChecks, validateGXExpectations } from '../utils/validateExpectations';
import { parseGXSuiteJSON } from '../utils/importGreatExpectations';

export const ValidationRuleImporter: Component = () => {
  const [isDragging, setIsDragging] = createSignal(false);

  const handleFile = async (file: File) => {
    const results = profileStore.store.results;
    if (!results) {
      profileStore.setValidationError('Please profile some data first');
      return;
    }

    profileStore.setValidationEvaluating(true);
    profileStore.setValidationError(null);

    try {
      const content = await file.text();
      const fileName = file.name;

      if (fileName.endsWith('.yml') || fileName.endsWith('.yaml')) {
        // SODA CHECKS
        const checks = parseSodaYaml(content);
        const validationResults = validateSodaChecks(results, checks);

        profileStore.addValidationSummary({
          fileName,
          format: 'soda',
          total: validationResults.length,
          passed: validationResults.filter((r) => r.status === 'pass').length,
          failed: validationResults.filter((r) => r.status === 'fail').length,
          skipped: validationResults.filter((r) => r.status === 'skipped').length,
          results: validationResults,
        });
      } else if (fileName.endsWith('.json')) {
        try {
          const json = JSON.parse(content);
          if (json.expectation_suite_name) {
            // GX Suite (FEAT-025)
            const parseResult = parseGXSuiteJSON(content);
            if (parseResult.success) {
              const validationResults = validateGXExpectations(
                results,
                parseResult.suite.expectations,
              );
              profileStore.addValidationSummary({
                fileName,
                format: 'gx',
                total: validationResults.length,
                passed: validationResults.filter((r) => r.status === 'pass').length,
                failed: validationResults.filter((r) => r.status === 'fail').length,
                skipped: validationResults.filter((r) => r.status === 'skipped').length,
                results: validationResults,
              });
            } else {
              profileStore.setValidationError(parseResult.error.message);
            }
          } else if (json.$schema || json.type || json.properties) {
            // JSON Schema (FEAT-027)
            const schema = parseJsonSchema(content);
            const validationResults = validateJsonSchema(results, schema);

            profileStore.addValidationSummary({
              fileName,
              format: 'json-schema',
              total: validationResults.length,
              passed: validationResults.filter((r) => r.status === 'pass').length,
              failed: validationResults.filter((r) => r.status === 'fail').length,
              skipped: validationResults.filter((r) => r.status === 'skipped').length,
              results: validationResults,
            });
          } else {
            profileStore.setValidationError(
              'Unknown JSON format. Expected JSON Schema or Great Expectations Suite.',
            );
          }
        } catch (e) {
          profileStore.setValidationError('Invalid JSON file');
        }
      } else {
        profileStore.setValidationError(
          'Unsupported file format. Please use .yml, .yaml, or .json',
        );
      }
    } catch (err) {
      console.error('Validation failed', err);
      profileStore.setValidationError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      profileStore.setValidationEvaluating(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div class="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById('validation-file-input')?.click()}
        class={`
          relative overflow-hidden cursor-pointer group
          border-2 border-dashed rounded-3xl p-8 text-center transition-all duration-300
          ${
            isDragging()
              ? 'border-blue-500 bg-blue-500/10 scale-[1.02] shadow-2xl shadow-blue-500/20'
              : 'border-slate-700 bg-slate-800/30 hover:border-slate-500 hover:bg-slate-800/50'
          }
        `}
      >
        <input
          id="validation-file-input"
          type="file"
          class="hidden"
          accept=".yml,.yaml,.json"
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            if (file) handleFile(file);
            e.currentTarget.value = ''; // Reset for same file re-upload
          }}
        />

        <div class="space-y-4">
          <div
            class={`
            mx-auto w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300
            ${isDragging() ? 'bg-blue-500 text-white scale-110 rotate-12' : 'bg-slate-700 text-slate-400 group-hover:bg-slate-600 group-hover:text-slate-200'}
          `}
          >
            <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <div>
            <h4 class="text-white font-black text-lg tracking-tight">Run Quality Validation</h4>
            <p class="text-slate-400 text-sm mt-1">Upload Soda Checks (YAML) or GX Suite (JSON)</p>
          </div>

          <div class="flex items-center justify-center gap-3">
            <span class="px-2 py-1 rounded-md bg-slate-800 text-[10px] font-bold text-slate-500 border border-slate-700">
              .YML
            </span>
            <span class="px-2 py-1 rounded-md bg-slate-800 text-[10px] font-bold text-slate-500 border border-slate-700">
              .YAML
            </span>
            <span class="px-2 py-1 rounded-md bg-slate-800 text-[10px] font-bold text-slate-500 border border-slate-700">
              .JSON
            </span>
          </div>
        </div>

        {/* Ambient Glow */}
        <div
          class={`
          absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/10 blur-[60px] rounded-full transition-opacity duration-1000
          ${isDragging() ? 'opacity-100' : 'opacity-0'}
        `}
        />
      </div>

      <Show when={profileStore.store.validation.error}>
        <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3 animate-in fade-in zoom-in duration-200">
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {profileStore.store.validation.error}
        </div>
      </Show>
    </div>
  );
};
