const { selectors } = require("@playwright/test");
const { time } = require("console");

exports.Inbox = 
class Inbox {
    constructor(page) {
        this.page = page;
        this.InboxTab = "//span[normalize-space()='Inbox']";
        this.TakeAction = "button[class='state-control-type state-control-type--active']";
        this.Open = "button[class='state-control-type']";
        this.JobList = '//div/table/tbody/tr/td/span/span/a/span[1]';
        this.JobTitle = '//div/h1';
        this.subHeading = "p[class='subheading']";
    }

    async CheckJob(JobName) {
        await this.page.waitForSelector(this.InboxTab);
        await this.page.click(this.InboxTab);
        await this.page.waitForTimeout(5000);
        await this.page.waitForSelector(this.JobList);
        const JobList = await this.page.$$(this.JobList);
        await this.page.screenshot({path: 'tests/Screenshots/'+Date.now()+'Inbox.png', fullpage:true});
        for (const Job of JobList) {
            if (JobName === await Job.innerText()) {
                await Job.click();
                console.log("Job Title is: ", await Job.innerText());
                await this.page.waitForTimeout(5000);
                break;
            }
            
            }
/*
            console.log("Subheading is: ", await this.page.locator(this.subHeading).innerText());
            const subheadingtitle = await this.page.evaluate((subheadingtitle) => {
                  const selection = window.getSelection();
                  const content = subheadingtitle.innerText;
                  const range = document.createRange();
                  range.setStart(element.childNodes[38], content.indexOf(subheadingtitle));
                  range.setEnd(element.childNodes[47], content.indexOf(subheadingtitle) + subheadingtitle.length);
                  selection.removeAllRanges();
                  selection.addRange(range);
                }, selectors.messageBodyTextsubheadingtitle);
                
                //await this.page.keyboard.press('Control+C');    
                //await this.page.waitForTimeout(5000);
                //const clipboardText = await this.page.evaluate(() => navigator.clipboard.readText());
               // console.log("Jobnumber is: ", clipboardText);
                //console.log("Jobnumber is: ", selectors.messageBodyTextsubheadingtitle);
                console.log("Jobnumber is: ", subheadingtitle);
                
                /*
                const innerText = await this.page.evaluate(() => {
                    const element = document.querySelector(this.subHeading);
                    console.log("Subheading is: ", this.page.locator(this.subHeading).innerText());
                    return element ? element.innerText : '';
                })
                const modifiedText = innerText.split(' ')[1];
                console.log('Job Number:', modifiedText);

                return modifiedText;
*/
            };
                    
                };

            


    

