import os

from fabric.api import env, local, run, cd, put, path
from fabric.decorators import runs_once


APP_DIR = "/usr/local/plotserver"

env.forward_agent = True
env.user = "publisher"

env.roledefs = {"plot": ["plot.prezi.com"], "stage": [], "local": []}
env.abort_on_prompts = True

def _gitpull():
    # runs on remote
    with cd(APP_DIR):
        run("git pull")

def _restart_plotserver():
    run("sudo /usr/bin/supervisorctl restart plotserver")

@runs_once
def plotserver(revno=None):
    _gitpull()
    _restart_plotserver()
