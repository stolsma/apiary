# TODO

Things to develop (in no particular order):

  * Use sort of forever proces to control spawning and existence of SRE processes. Forever can't be used at this moment because it doesn't have a possibility to use fork to create child proces
  * Aditional documentation on architecture
  * Creation of system Network Gateway's. First to implement is http-proxy!
  * Implementation of System Service Environment (SSE) with system services like MySQL, Postgres, mDNS, Bonjour, uPnP for use by all user SRE services!!
  * Add startup script which deamonizes the apiary System controller and gives possibilities to control the apiary deamon from the CLI. Commands like: save config, restart, stop, start
  * Add REST interface to the System Controller
  * Add examples