import Lake
open Lake DSL
open System (FilePath)

require verso from git "https://github.com/leanprover/verso"@"v4.32.0"

-- Physlib is an *external* dependency: this repo carries no physics content
-- of its own, it only renders Physlib's source as a wiki. Pin `@rev` to a tag
-- or commit for reproducible builds; `master` tracks the latest Physlib.
require Physlib from git "https://github.com/leanprover-community/physlib.git"@"master"

package «physlib-verso» where
  -- No `packagesDir` override: this is a standalone workspace, so Lake resolves
  -- and builds dependencies (verso, Physlib, mathlib, …) under this repo's
  -- own `.lake/packages`.

/--
Verso's lakefile declares a `literate` module facet that extracts a module's
code, docstrings, and module docstrings to JSON. This makes its result type
known to this lakefile so the facet can be fetched from here.
-/
module_data literate : FilePath

/--
The `wiki` facet renders the Physlib modules listed in `literate.toml` as a
static literate-programming website.

This is verso's own `literateHtml` package facet (see the verso package's
lakefile), adapted so that:
 * the modules come from the `Physlib` package (a git dependency of this
   repository) rather than from this package, and
 * the configuration file and the generated site both live at this repo's root.

Build it with `lake query :wiki`; the path of the generated site is printed on
success.
-/
package_facet wiki pkg : FilePath := do
  let ws ← getWorkspace
  let some physlib := ws.findPackageByName? `Physlib
    | error "The Physlib package was not found in the workspace"
  let some planExe ← findLeanExe? `«verso-literate-plan»
    | error "The verso-literate-plan executable was not found in the workspace"
  let some htmlExe ← findLeanExe? `«verso-literate-html»
    | error "The verso-literate-html executable was not found in the workspace"

  let buildDir := pkg.buildDir
  let htmlDir := buildDir / "literate-html"
  let planFile := buildDir / "literate-plan"
  let moduleListFile := buildDir / "literate-modules"
  let moduleMapFile := buildDir / "literate-module-map"
  let tomlFile := pkg.dir / "literate.toml"

  -- Step 1: Collect all modules from the Physlib package's libraries
  let allModules ← physlib.leanLibs.foldlM (init := #[]) fun acc lib => do
    let mods ← (← lib.modules.fetch).await
    return acc ++ mods.map fun m => (lib.name, m, lib.srcDir)

  let moduleListContent :=
    "\n".intercalate (allModules.map fun (libName, mod, _) => s!"{libName}\t{mod.name}").toList ++ "\n"

  let planExeJob ← planExe.exe.fetch
  let htmlExeJob ← htmlExe.exe.fetch

  planExeJob.bindM fun planExeFile => do
    if ← tomlFile.pathExists then
      addTrace (← computeTrace tomlFile)
    else
      addPureTrace "No literate TOML config file"
    addPureTrace moduleListContent

    buildFileUnlessUpToDate' moduleListFile do
      IO.FS.createDirAll buildDir
      IO.FS.writeFile moduleListFile moduleListContent

    -- Re-add TOML trace (buildFileUnlessUpToDate' resets trace to output file hash)
    if ← tomlFile.pathExists then
      addTrace (← computeTrace tomlFile)
    addPureTrace moduleListContent

    buildFileUnlessUpToDate' planFile do
      let planArgs := #[moduleListFile.toString, planFile.toString] ++
        (if ← tomlFile.pathExists then #[tomlFile.toString] else #[])
      proc {
        cmd := planExeFile.toString
        args := planArgs
        env := ← getAugmentedEnv
      }

    -- Step 2: Read plan, fetch literate JSON for planned modules only
    let planContents ← IO.FS.readFile planFile
    let plannedNames := planContents.splitOn "\n"
      |>.filter (!·.isEmpty)
      |>.map String.toName

    let litJobs ← plannedNames.filterMapM fun name => do
      match allModules.find? fun (_, mod, _) => mod.name == name with
      | some (_, mod, srcDir) =>
        let job ← mod.facet `literate |>.fetch
        pure (some (name, job, srcDir))
      | none => pure none

    (Job.collectArray (litJobs.map (·.2.1) |>.toArray)).bindM fun litFiles => do
      -- Build module→JSON mapping (litFiles[i] corresponds to litJobs[i])
      let mappingContent := "\n".intercalate
        (litJobs.zip litFiles.toList |>.map fun ((name, _, srcDir), jsonPath) =>
          s!"{name}\t{jsonPath}\t{srcDir}") ++ "\n"
      addPureTrace mappingContent

      buildFileUnlessUpToDate' (text := true) moduleMapFile do
        IO.FS.writeFile moduleMapFile mappingContent

      -- Step 3: Run HTML generator with module map
      htmlExeJob.mapM fun htmlExeFile => do
        -- Re-add traces that were reset by buildFileUnlessUpToDate'
        for jsonPath in litFiles do
          addTrace (← computeTrace jsonPath)
        if ← tomlFile.pathExists then
          addTrace (← computeTrace tomlFile)
        -- Trace the static assets (extra_css/extra_js) so that editing
        -- them re-renders the site even when literate.toml is unchanged.
        let staticDir := pkg.dir / "static"
        if ← staticDir.pathExists then
          for entry in (← staticDir.readDir) do
            if (← entry.path.pathExists) && !(← entry.path.isDir) then
              addTrace (← computeTrace entry.path)
        buildUnlessUpToDate htmlDir (← getTrace) (htmlDir.addExtension "trace") do
          IO.FS.createDirAll htmlDir
          let mut htmlArgs := #[htmlDir.toString, moduleMapFile.toString]
          if ← tomlFile.pathExists then
            htmlArgs := htmlArgs.push tomlFile.toString
          proc {
            cmd := htmlExeFile.toString
            args := htmlArgs
            env := ← getAugmentedEnv
          }
        pure htmlDir
