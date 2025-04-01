import {InfosDialog, ConfirmDialog, WarningDialog, ErrorDialog} from "../../wailsjs/go/main/App";

export async function confirm(message) {
    try{
        const res = await ConfirmDialog(message)
        return res
    } catch(e){
        console.log(e)
        return false
    }
}

export function alert(message) {
    try{
        InfosDialog(message)
    } catch(e){
        console.log(e)
    }
}

export function warning(message) {
    try{
        WarningDialog(message)
    } catch(e){
        console.log(e)
    }
}

export function error(message) {
    try{
        ErrorDialog(message)
    } catch(e){
        console.log(e)
    }
}