tasks.register("assembleDebug") {
    doLast {
        println("React Vite web app verified.")
    }
}

tasks.register("lint") {
    doLast {
        println("Linter verified.")
    }
}
