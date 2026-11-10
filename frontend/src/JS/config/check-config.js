import { CheckSoloConfig, CheckGroupConfig, PrintJsonFile, SaveConfig, DetectIfOneOreMoreConfFileHaveEmptyExpectedOutputInAConfDir } from '../../../wailsjs/go/main/App'
import { alert, confirm } from '../popup';
import { printResult } from "../print-test-result";
import { reloadCurrentIfAffected } from './edit-config';
import { pathOf } from "../explorer/state";
import loadingImage from "../../assets/images/circle-loading.gif"

// Lance une config ({group, file}) ou un groupe entier ({group}).
// `button` (optionnel) affiche le gif de chargement pendant l'exécution.
export async function runConfig(target, forcedUpdate = false, button = null) {
    if (window.runningConf) {
        alert("Already running config")
        return
    }
    window.runningConf = true
    const previousContent = button?.innerHTML
    if (button) button.innerHTML = `<img src="${loadingImage}" alt="Loading" />`
    try {
        await checkConfig(target, forcedUpdate)
    } finally {
        if (button) button.innerHTML = previousContent
        window.runningConf = false
    }
}

async function checkConfig({ group, file = null }, forcedUpdate = false) {
    let fillExpectedOutput = false
    let firstRunSaved = false

    // File
    if (file && !forcedUpdate) {
        try {
            const conf = await PrintJsonFile(pathOf(group, file));
            if (String(conf.globalAskedToFillExpectedOutPut).includes("false")) {
                fillExpectedOutput = await confirm("This is the first time you're running this config file.\nDo you want to automatically fill the expected output with the actual output ?\nThis will no overwrite the already defined Expected Output\nConsider adding '_@empty' if the endpoint send back nothing")
                conf.globalAskedToFillExpectedOutPut = "true"
                await SaveConfig(group, file, conf)
                firstRunSaved = true
            }
        } catch (e) {
            console.log(e)
        }
    }
    // Folder
    else if (!file && !forcedUpdate) {
        // Si un des fichiers du groupe n'a jamais été lancé, proposer de remplir les ExpectedOutput vides
        try {
            if (await DetectIfOneOreMoreConfFileHaveEmptyExpectedOutputInAConfDir(`${group}/`)) {
                fillExpectedOutput = await confirm("Do you want to automatically fill the expected output ?\nThis will not overwrite the existing ExpectedOutput.")
            }
        } catch (e) {
            console.log(e)
        }
    }

    try {
        const result = file
            ? await CheckSoloConfig(pathOf(group, file), fillExpectedOutput, forcedUpdate)
            : await CheckGroupConfig(`${group}/`, fillExpectedOutput, forcedUpdate)

        if (result) {
            printResult(null, result)
        } else {
            alert("Impossible to show the file conf")
        }
    } catch (e) {
        console.log(e)
        alert(e.toString())
        printResult(null, null)
    }

    // Le fichier a pu être réécrit (expectedOutput / flags) : rafraîchir l'éditeur s'il l'affiche
    if (fillExpectedOutput || forcedUpdate || firstRunSaved) {
        await reloadCurrentIfAffected({ group, file })
    }
}
