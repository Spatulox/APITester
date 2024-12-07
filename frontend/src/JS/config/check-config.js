
import { CheckSoloConfig, CheckGroupConfig } from '../../../wailsjs/go/main/App'
import {printResult} from "../print-test-result";



export async function checkConfig(filepath){
    
    if(filepath.includes("root")){
        filepath = filepath.replace(/^root[/\\]/, "");
    }

    try{
        let result
        // If it's a file
        if(filepath.endsWith(".json")){
            console.log("Checking file")
            result = await CheckSoloConfig(filepath)
        }
        // If not a file
        else if (filepath.endsWith("/")){
            console.log("Checking folder")
            result = await CheckGroupConfig(filepath)
        }
        else {
            throw new Error("Wrong path the check. Must finish by '/' or by '.json'...")
        }
        printResult(result)
        //return result

    } catch (e){
        console.log(e)
        alert(e.toString())
        printResult(null)
        //return null
    }
}