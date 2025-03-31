
import { CheckSoloConfig, CheckGroupConfig, PrintJsonFile, DetectIfOneOreMoreConfFileHaveEmptyExpectedOutputInAConfDir } from '../../../wailsjs/go/main/App'
import {printResult} from "../print-test-result";
import { clearEditConfig, jsonToHtml} from './edit-config';

export async function checkConfig(event, filepath){
    if(filepath.includes("root")){
        filepath = filepath.replace(/^root[/\\]/, "");
    }

    let fillExpectedOutput = false

    // File
    if(filepath.endsWith(".json")){
        const jsonString = await PrintJsonFile(`${filepath}`);
        
        console.log(jsonString.globalAskedToFillExpectedOutPut)

        if(jsonString.globalAskedToFillExpectedOutPut.includes("false")){
            fillExpectedOutput = confirm("This endpoint don't have any ExpectedOutput.\nDo you want to automatically fill the expected output with the actual output ?\nConsider adding '_@empty' if the endpoint send back nothing")
            jsonString.globalAskedToFillExpectedOutPut = "true"

            document.getElementById('output').innerHTML = ""
            document.getElementById('output').appendChild(jsonToHtml(jsonString, `${filepath}`));
            document.getElementById("save-config").click()
            clearEditConfig()
        }
    }
    // Folder
    else {
        // Lire tous les fichiers de conf, détecter si un des trucs est "globalAskedToFillExpectedOutPut = false"
        // Si oui, demande a l'utilisateur s'il veut que les ExpectedOutput non rempli
        try{
            console.log(await DetectIfOneOreMoreConfFileHaveEmptyExpectedOutputInAConfDir(`${filepath}`))
            if(await DetectIfOneOreMoreConfFileHaveEmptyExpectedOutputInAConfDir(`${filepath}`)){
                fillExpectedOutput = confirm("Do you want to automatically fill the expected output ?\nThis will not overwrite the existing ExpectedOutput.")
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
            result = await CheckSoloConfig(filepath, fillExpectedOutput)
        }
        // If not a file
        else if (filepath.endsWith("/")){
            console.log("Checking folder")
            result = await CheckGroupConfig(filepath, fillExpectedOutput)
        }
        else {
            throw new Error("Wrong path the check. Must finish by '/' or by '.json'...")
        }
        if(result){
            printResult(event, result)
        } else {
            alert("Impossible to show the file conf")
        }
        //return result

    } catch (e){
        console.log(e)
        alert(e.toString())
        printResult(event, null)
        //return null
    }
}