#!/usr/bin/env python

'''
Created on Aug 29, 2016

@author: paepcke
'''

import argparse
import datetime
import json
import logging
import os
import re
import signal
import subprocess
import sys
import time

import tornado.ioloop
import tornado.web


class UxRecorder(tornado.web.RequestHandler):

    # Remember whether logging has been initialized (class var!):
    loggingInitialized = False
    logger  = None
    uidDict = None
    uidFile = None
    
    TEST_UID_DB = {"test*" : ''}

    #---------------------------
    # prepare 
    #----------------*/

    def prepare(self):
        self.set_default_headers()
        
    #---------------------------
    # initialize 
    #----------------*/

    def initialize(self):
        '''
        Called for each incoming request.
      
        '''
        pass
        
    #---------------------------
    # initializeOnce 
    #----------------*/
    
    @classmethod
    def initializeOnce(cls, loggingLevel=logging.INFO, logFile=None, uidFile=None):
        '''
        :param loggingLevel: level at which logging output is show. 
        :type loggingLevel: {logging.DEBUG | logging.WARN | logging.INFO | logging.ERROR | logging.CRITICAL}
        :param logFile: path to file where log is to be written. Default is None: log to stdout.
                        A warning is logged if logFile is None and the destination is OutputPipe. In this
                        case logging messages will be mixed in with the data output
        :type logFile: String
        
        '''

        logDest = cls.setupLogging(loggingLevel, logFile, utc=True)
        # Regex pattern for excaping CSV separator in log entries:
        cls.csvSeparatorRe = re.compile(r'\|')
        cls.uidFile = uidFile
        cls.uidDict = cls.loadUserIds(uidFile)
        
        timeNow = datetime.datetime.now().isoformat()
        numUids = len(cls.uidDict.keys())
        # This being a class method we don't
        # yet have self.logInfo(), which would
        # add separator ('|') and quotes around txt.
        # So do that here:
        cls.logger.info('|Start logging UTC times at %s (local time), numUids: %s.' %\
                        (timeNow, numUids))
        
        # React to SIGUSR1 by reloading UID db:
        signal.signal(signal.SIGUSR1, cls.handle_sig_usr1)
                
        print('''Started statlet ux recorder at %s
                Time zone: UTC-logging 
                To: %s
                Number of login names found: %s
                ''' % \
              (timeNow, logDest, numUids))
              
    #---------------------------
    # get
    #----------------*/

    def get(self):
        #self.write(self.request.remote_ip)
        #print(self.request.remote_ip);
        pass
    
    #---------------------------
    # post 
    #----------------*/
        
    def post(self):
    
        try:
            body = self.request.body
            reqMsg  = json.loads(body)
        except Exception as e:
            self.logError("Bad request '%s' (%s)" % (body, `e`))
            return
            
        try:
            reqType = reqMsg['reqType']
            if reqType == "log":
                try:
                    # Most frequent branch: an interaction with the statlet
                    # other than login:
                    self.logInteraction(reqMsg)
                except KeyError:
                    self.logError("Log request w/o body '%s'" % body)
                return        
        except KeyError:
            self.logError("Log request w/o request type: '%s'" % body)
            return
        
        # Answer needed:
        if reqType == "myIp":
            self.write(self.request.remote_ip)
            
        elif reqType == "login":
            try:
                userId = reqMsg['uid']
            except KeyError:
                # These attempts to signal error to browser-client aren't working:
                #******self.send_error("Software error: Login request without login name.")
                self.send_error(status_code=422, reason="Software error: Login request without login name.") # Unprocessabel Entity
                return
            action = reqMsg.get("action", None)
            if action is not None:
                try:
                    browser = json.loads(action)['loginBrowser']
                except (ValueError, AttributeError):
                    browser = "unknown"
            
            if self.isRegistered(userId):
                self.write("loginOK")
                reqMsg["action"] = '{"login" : "OK", "browser" : "%s"}' % browser
                self.logInteraction(reqMsg) # Log the login
            else:
                self.write("loginNOK")
                reqMsg["action"] = '{"login" : "NOK", "browser" : "%s"}' % browser
                self.logInteraction(reqMsg)

    #---------------------------
    # logInteraction 
    #----------------*/

    def logInteraction(self, reqBody):
        '''
        Write to disk log. Requests look like this:
                {
                 "reqType" : "log",
				 "context" : "confidence",
				 "uid"     : myUid,
				 "action"  : txtJsonValue,
				 }
				 
        Logins are special:
                {
                 "reqType" : "login",
				 "context" : "confidence",
				 "uid"     : myUid,
				 "action"  : browser
				 }
               
				 
		Create record:
		   <date> <time>: |uid|statlet|action
		where action is a JSON description what user did.
				 
        :param reqBody: the 'request', usually action report from clients.
        :type msgBody: { string : {string | number }
        '''

        uid = reqBody.get("uid", "unknown")
        context = reqBody.get("context", "unknown")
        action = reqBody.get("action", "unknown")

        
        # Escape any CSV fld separators in the action value:     
        action = UxRecorder.csvSeparatorRe.sub("\|", action)
        
        UxRecorder.logger.info('|%s|%s|%s' % (uid, context, action))

    #---------------------------
    # isRegistered 
    #----------------*/
            
    def isRegistered(self, loginId):
        # Allow either students' sunetID,
        # or their email address. Ex.:
        #    Either  judyl@stanford.edu
        #        or  judyl
        
        try:
            # Does login name have '@stanford.edu'?
            loginId.index("@stanford.edu")
        except ValueError:
            # No: add that:
            loginId = loginId + "@stanford.edu"
        try:
            UxRecorder.uidDict[loginId]
            return True
        except KeyError:
            return False

    #---------------------------
    # loadUserIds
    #----------------*/

    @classmethod
    def loadUserIds(cls, uidFile):

        uidDict = {}
        if uidFile is None:
            return UxRecorder.TEST_UID_DB
        try:
            with open(uidFile, 'r') as uidsFd:
                for uidLine in uidsFd:
                    uidDict[uidLine.strip()] = ""
        except:
            print("Could not read uid file %s (using stub dict): " % uidFile)
            return UxRecorder.TEST_UID_DB

        return uidDict    
    
    #---------------------------
    # setupLogging
    #----------------*/
    
        
    @classmethod        
    def setupLogging(self, loggingLevel=logging.INFO, logFile=None, utc=False):
        '''

        Example use raw:
        	UxRecorder.logger.info("Info for you")
        	UxRecorder.logger.warn("Warning for you")
        	UxRecorder.logger.debug("Debug for you")
        	
        Good move: set self.log to UxRecorder.logger
                   then:
            log.info(...)
            log.warn(...)
            etc.
            
        Even better move (potentially):
            write instance methods logInfo(), logWarn(), etc.,
            which might add quotes around txt, and a record
            separator for easy CSV reading later on.
        
        :param loggingLevel: one of logging.INFO, logging.WARN, logging.ERROR.
                For more option see Python logging doc.
        :type loggingLevel: int
        :param logFile: if a path, append to that file. If None, log to console.
        :type logFile: { string | None }
        :param utc: if true, time included in log entries is in Coordinated Universal Time
                (formerly GMT)
        :type utc: bool
        :return passed-in file path, or "console" if logFile is None.
        :raise IOError if logging to file is requested, but file not writeable.
        '''
        
        if UxRecorder.loggingInitialized:
            # Remove previous file- or console-handlers,
            # else we get logging output doubled:
            UxRecorder.logger.handlers = []
            
        # Set up logging:
        UxRecorder.logger = logging.getLogger('uxlogging')
        UxRecorder.logger.setLevel(loggingLevel)

        # Create file handler if requested:
        if logFile is not None:
            # If the file does not exist, create it:
            if not os.access(logFile, os.F_OK):
                with open(logFile, 'a') as fd:  # @UnusedVariable
                    pass
            if not os.access(logFile, os.W_OK):
                raise IOError("Requested log file location not writable: %s" % logFile)
            
            handler = logging.FileHandler(logFile)
        else:
            # Create console handler:
            handler = logging.StreamHandler()
        
        if utc:
            logging.Formatter.converter = time.gmtime
            
        # Create formatter and add it to the handlers
        #formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        formatter = logging.Formatter('%(asctime)s: %(message)s')
        handler.setFormatter(formatter)

        # Add the handler to the logger
        UxRecorder.logger.addHandler(handler)
        
        UxRecorder.loggingInitialized = True
        if logFile is not None:
            return logFile
        else:
            return "concole"

    #---------------------------
    # logInfo, logError, logWarn 
    #----------------*/

    def logInfo(self, txt):
        '''
        Convenience method for logging. 
        Prepends record separator '|'.
        Escapes any occurrences of '|'
        in text.
        
        :param txt: text to log
        :type txt: string
        '''
        
        UxRecorder.logger.info('|%s' % UxRecorder.csvSeparatorRe.sub("\|", txt))
        
    def logError(self, txt):
        '''
        Convenience method for logging.
        Adds "error" to standard logging line header. 
        Prepends record separator '|'.
        Escapes any occurrences of '|'
        in text.
        
        :param txt: text to log
        :type txt: string
        '''
        UxRecorder.logger.error('(error)|%s' % UxRecorder.csvSeparatorRe.sub("\|", txt))

    def logWarn(self, txt):
        '''
        Convenience method for logging.
        Adds "warn" to standard logging line header. 
        Prepends record separator '|'.
        Escapes any occurrences of '|'
        in text.
        
        :param txt: text to log
        :type txt: string
        '''
        UxRecorder.logger.warn('(warn)|%s' % UxRecorder.csvSeparatorRe.sub("\|", txt))
    
    #---------------------------
    # set_default_headers 
    #----------------*/

    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "*")
        self.set_header("Access-Control-Allow-Headers", "x-requested-with")
        self.set_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        
    #---------------------------
    # options 
    #----------------*/
        
    def options(self):
        # no body
        self.set_status(204)
        self.finish()

    #---------------------------
    # handleSigUsr1 
    #----------------*/
    
    @classmethod
    def handle_sig_usr1(cls, sig, frame):
        if sig == signal.SIGUSR1:
            UxRecorder.uidDict = cls.loadUserIds(UxRecorder.uidFile)
            print('Reloaded %s' % UxRecorder.uidFile)
        else:
            print('Received uncaught signal %s' % sig)
        

    #---------------------------
    # getUxRecorderPid 
    #----------------*/

    @classmethod
    def get_ux_recorder_pid(cls):
        this_prog = os.path.basename(__file__)
        child = subprocess.Popen(['pgrep', '-f', this_prog], stdout=subprocess.PIPE)
        pid   = child.communicate()[0].strip()
        return pid

    # -------------------------------  Startup ------------------        
    
def make_app():
    return tornado.web.Application([
        (r"/", UxRecorder),
    ])

if __name__ == "__main__":
    
    parser = argparse.ArgumentParser()
    parser.add_argument('-v', '--version',
                        action='store_true',
                        help='Current version of login server.'
                        )
    parser.add_argument('-r', '--reload',
                        dest='reload',
                        action='store_true',
                        help="Reloads user id database."
                        )
    
    args = parser.parse_args()
    if args.version:
        print('Version 1.0')
        sys.exit()

    uidPath = os.path.join(os.getenv("HOME"), ".ssh", "stats60Uids.txt")
        
    # Reload UID db?
    if args.reload:
        # Find the (hopefully already running) uxrecorder's pid:
        try:
            ux_recorder_pid = int(UxRecorder.get_ux_recorder_pid())
        except ValueError:
            print('Could not find PID of a running uxrecorder.py process.')
            sys.exit()
        os.kill(ux_recorder_pid, signal.SIGUSR1)
        print('Done signalling process to trigger reload.')
        sys.exit()    
        
    # File holding acceptable login names, one per line:
    logPath = os.path.join(os.getenv("HOME"), ".ssh", "stats60Statlets.log")
    app = make_app()
    UxRecorder.initializeOnce(loggingLevel=logging.INFO, logFile=logPath, uidFile=uidPath)
    app.listen(8889)
    tornado.ioloop.IOLoop.current().start()
