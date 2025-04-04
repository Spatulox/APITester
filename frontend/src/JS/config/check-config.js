
import { CheckSoloConfig, CheckGroupConfig, PrintJsonFile, DetectIfOneOreMoreConfFileHaveEmptyExpectedOutputInAConfDir } from '../../../wailsjs/go/main/App'
import { alert, confirm } from '../popup';
import {printResult} from "../print-test-result";
import { clearEditConfig, jsonToHtml, printJsonToEditTab} from './edit-config';

export async function checkConfig(event, filepath, forcedUpdate = false){
    if(filepath.includes("root")){
        filepath = filepath.replace(/^root[/\\]/, "");
    }

    let fillExpectedOutput = false

    // File
    if(filepath.endsWith(".json") && !forcedUpdate){
        const jsonString = await PrintJsonFile(`${filepath}`);
        
        console.log(jsonString.globalAskedToFillExpectedOutPut)

        if(jsonString.globalAskedToFillExpectedOutPut.includes("false")){
            fillExpectedOutput = await confirm("This is the first time you're running this config file.\nDo you want to automatically fill the expected output with the actual output ?\nThis will no overwrite the already defined Expected Output\nConsider adding '_@empty' if the endpoint send back nothing")
            jsonString.globalAskedToFillExpectedOutPut = "true"

            document.getElementById('output').innerHTML = ""
            document.getElementById('output').appendChild(jsonToHtml(jsonString, `${filepath}`));
            document.getElementById("save-config").click()
            clearEditConfig()
        }
    }
    // Folder
    else if(!forcedUpdate) {
        // Lire tous les fichiers de conf, détecter si un des trucs est "globalAskedToFillExpectedOutPut = false"
        // Si oui, demande a l'utilisateur s'il veut que les ExpectedOutput non rempli
        try{
            console.log(await DetectIfOneOreMoreConfFileHaveEmptyExpectedOutputInAConfDir(`${filepath}`))
            if(await DetectIfOneOreMoreConfFileHaveEmptyExpectedOutputInAConfDir(`${filepath}`)){
                fillExpectedOutput = await confirm("Do you want to automatically fill the expected output ?\nThis will not overwrite the existing ExpectedOutput.")
            }
        } catch (e){
            console.log(e)
        }
    }

    try{
        let result
        // If it's a file
        if(filepath.endsWith(".json")){
            console.log("Checking file")
            console.log(filepath, fillExpectedOutput, forcedUpdate)
            result = await CheckSoloConfig(filepath, fillExpectedOutput, forcedUpdate)
        }
        // If not a file
        else if (filepath.endsWith("/")){
            console.log("Checking folder")
            result = await CheckGroupConfig(filepath, fillExpectedOutput, forcedUpdate)
        }
        else {
            throw new Error("Wrong path the check. Must finish by '/' or by '.json'...")
        }
        if(result){
            printResult(event, result)
        } else {
            alert("Impossible to show the file conf")
        }

        // update the edit config tab
        if(fillExpectedOutput || forcedUpdate){
            try{
                await printJsonToEditTab(`${filepath}`)
            } catch (e) {
                alert("Impossible to display the file")
                console.log(e)
            }
        }
        //return result

    } catch (e){
        console.log(e)
        alert(e.toString())
        printResult(event, null)
        //return null
    }
}