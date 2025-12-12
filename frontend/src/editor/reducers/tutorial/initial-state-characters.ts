import { Characters } from "../../../types";

const InitialCharacters: Characters = {
  jizye5ng66r: {
    id: "jizye5ng66r",
    name: "Flag",
    rules: [
      {
        id: "1490581218005",
        name: "Untitled Rule",
        type: "rule",
        actors: {
          "1483668698770": {
            id: "1483668698770",
            position: {
              x: -1,
              y: 0,
            },
            transform: "0",
            appearance: "1483692402546",
            characterId: "aamlcui8uxr",
            variableValues: {},
          },
          "1483692814723": {
            id: "1483692814723",
            position: {
              x: 0,
              y: 0,
            },
            appearance: "ax1",
            characterId: "jizye5ng66r",
            variableValues: {},
          },
        },
        extent: {
          xmax: 0,
          xmin: -1,
          ymax: 0,
          ymin: 0,
          ignored: {},
        },
        actions: [
          {
            type: "appearance",
            actorId: "1483692814723",
            value: {
              constant: "1490581038691",
            },
          },
        ],
        conditions: [],
        mainActorId: "1483692814723",
      },
    ],
    variables: {},
    spritesheet: {
      appearances: {
        ax1: [
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAABE0lEQVRYR+2Y2xGEIAxFtbTtZEuxlO1kS2PxgYMZsnkZ5CN+OoQcLpcEnSe/J1VTz9o06kAsYabawMDE6jzqQAhYwMr7YQAh2DCAGNijgBRUve1li9M3+/EFLck/MiwPSsBqBQ+4xpm5CVADdqbelUN23AhoAjtyu5ziO8CgZC4evAN0VdDdg6saalhPD1JtjGNxFw9yEpcxlLJd6yAF3oLt5kEKDr00POFBIeyY98FqERugSx0UKoUe+i51UAub4ZJbL9ZCgbjwoFXIFB40ShgeNAo4hQfNClYTsL4eWwnVgQz66MUMkfAh0YtN8u3BUaitIkahFim4vC+eu8QuH+f/gy3Sf0DUyiTA4k5iAYPgHNAfkPFqKStkGYEAAAAASUVORK5CYII=",
        ],
        "1490581038691": [
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAACIElEQVRYR91Y0XXEIAyDzXqbdJOmm3STG40+OMxzwLYMJG1f7zMhRsiSbS6GP/6LXnzpGVJ8BGl9ohhHSOHjGYOyriwz4ohQbgFIO/VAZ8HlOA1gSinFGE3AeYPwlkK3bmCQAH4+Xq+OYMftqeMHGQAtnBICzAA8qZeYFxkrTNWfpSemqcrUS4M9gwSQM4Xitv2RSQisETClZ8jGCNkkPRhKs/Ycpd9tEuMgBVUGSWC8LHLwGtApgIqRThq0GETvJEPJGnQ4mhitpmoapOcrLPIsEaNTDCppHjTo1WFex9PsZhAZp3s/aFByrWUWyyiX10EOXkuzxJRGCqyD+UNHbx00KKUZlRQJpEuDoBaKGiSA3oKsMrjQ2vpYgwZXmOLdq3WRx2QT11zMnrsy4jVhIU9b7JluagfJc2I79G68/vsrTtw0yMc3L0toXQHoZctKcR0YrjjwaZsrArZePMOgZAqppG0D5L3YAtgDQuWHsroNsCikzoMzDCLtDa7TKOeBrFvdv9PgNIPeD4Y28rovwzq4Gv92DSLpILNcArB2FHPq+VUG7+rFpS6unoy+89bB1X3cAI2ZcLoOWq21fwcBei7umgYd30Ji9XGr/v2BXJY7CdLgzlCs3kkcwJoMEUCaG6VhAFG4PW7NmmSWTahBdMIfGxYcQLQl7dI0IQv3dtsMHu8nk5w2Pr726+w0QAsQogUBluqjG+AOsB44AsrXfwNEqzP1uX8x1QAAAABJRU5ErkJggg==",
        ],
      },
      appearanceNames: {
        ax1: "Idle",
        "1490581038691": "Success",
      },
    },
  },
  oou4u6jemi: {
    id: "oou4u6jemi",
    name: "Boulder",
    rules: [],
    variables: {},
    spritesheet: {
      appearances: {
        idle: [
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAABqUlEQVRYR+3YSxKDIAwA0Ho/Fh6CY3EIF9zPDo4wMSYk4VNdtMvK55kEUJfPy39Lr897v0tjhBCa52nqqEFxaCvWBOyBYbAWqgKOhFmhItCCW9e1zL9tm1Sa5XotmlVgC84Cg3fAIVmgFdcKk5Ak0IpLk4wApnFwJG9AC05dZMaGEPkYEC4onAEWOCN62pWd2sEyychLBGcAYXYxonbtBpyNyxgrskTwV8AE5ZBUmtXAWlEbFykLxPiU5gMoRa+WFitOao/nUgGlQUdenw7EpSCdMhg0DZhh+MiTyoO6Dv97PMV/YO8C6Y6gVEMzgHBMsQZfATzFu/f+FpCZQGnscpL0ALXnaksp3IDnsUdGEf5J7XW404hXAAxMc5Bpbrn73j6PPLBa0K8FhhDyfRw7DPXaeXytola0JQKtbU9gcXW/F7dCuH7ie7HmAXY0Co6nAuYOMcZ9xHahvSGcXq4G4XhN2450QlDghIsxfpxzl7KTPr81A6UnaYw0f90CA5Rv0LNWNpXay16jrZFUk7UjTzsOET223KQUV+dMYOcc20aKeN6UqdrLg34BO84huw5/MoAAAAAASUVORK5CYII=",
        ],
      },
      appearanceNames: {
        idle: "Idle",
      },
    },
  },
  aamlcui8uxr: {
    id: "aamlcui8uxr",
    name: "Hero",
    rules: [
      {
        id: "1483692901714",
        code: 39,
        type: "group-event",
        event: "key",
        rules: [
          {
            id: "1483692914037",
            name: "Walk Right",
            type: "rule",
            actors: {
              "1483668698770": {
                id: "1483668698770",
                position: {
                  x: 0,
                  y: 0,
                },
                transform: "flip-x",
                appearance: "1483692402546",
                characterId: "aamlcui8uxr",
                variableValues: {},
              },
            },
            extent: {
              xmax: 1,
              xmin: 0,
              ymax: 0,
              ymin: 0,
              ignored: {},
            },
            actions: [
              {
                type: "move",
                delta: {
                  x: 1,
                  y: 0,
                },
                actorId: "1483668698770",
              },
              {
                type: "transform",
                actorId: "1483668698770",
                operation: "set",
                value: {
                  constant: "0",
                },
              },
            ],
            conditions: [
              {
                enabled: false,
                comparator: "=",
                right: {
                  constant: "1483692402546",
                },
                left: {
                  variableId: "appearance",
                  actorId: "1483668698770",
                },
                key: "1751940547903",
              },
            ],
            mainActorId: "1483668698770",
          },
        ],
      },
      {
        id: "1483692898285",
        code: 37,
        type: "group-event",
        event: "key",
        rules: [
          {
            id: "1483692943393",
            name: "Walk Left",
            type: "rule",
            actors: {
              "1483668698770": {
                id: "1483668698770",
                position: {
                  x: 0,
                  y: 0,
                },
                appearance: "1483692402546",
                characterId: "aamlcui8uxr",
                variableValues: {},
              },
            },
            extent: {
              xmax: 0,
              xmin: -1,
              ymax: 0,
              ymin: 0,
              ignored: {},
            },
            actions: [
              {
                type: "move",
                delta: {
                  x: -1,
                  y: 0,
                },
                actorId: "1483668698770",
              },
              {
                type: "transform",
                actorId: "1483668698770",
                operation: "set",
                value: {
                  constant: "flip-x",
                },
              },
            ],
            conditions: [
              {
                enabled: false,
                comparator: "=",
                right: {
                  constant: "1483692402546",
                },
                left: {
                  variableId: "appearance",
                  actorId: "1483668698770",
                },
                key: "1751940547904",
              },
            ],
            mainActorId: "1483668698770",
          },
        ],
      },
      {
        id: "14836928982851",
        type: "group-event",
        event: "idle",
        rules: [
          {
            id: "1490495811528",
            name: "If dead, move to left edge of world",
            type: "rule",
            actors: {
              "1483668698770": {
                id: "1483668698770",
                position: {
                  x: 0,
                  y: 0,
                },
                transform: "180",
                appearance: "1483692402546",
                characterId: "aamlcui8uxr",
                variableValues: {},
              },
              "1483692723872": {
                id: "1483692723872",
                position: {
                  x: -1,
                  y: 0,
                },
                transform: "flip-x",
                appearance: "1483692635012",
                characterId: "1483692598319",
                variableValues: {},
              },
              "1483692756444": {
                id: "1483692756444",
                position: {
                  x: -1,
                  y: -1,
                },
                transform: "flip-x",
                appearance: "1490493932180",
                characterId: "1483692683990",
                variableValues: {},
              },
            },
            extent: {
              xmax: 0,
              xmin: -1,
              ymax: 0,
              ymin: -2,
              ignored: {
                "0,0": true,
                "-1,0": true,
                "0,-1": true,
                "0,-2": true,
                "-1,-1": true,
                "-1,-2": true,
              },
            },
            actions: [
              {
                type: "move",
                delta: {
                  x: -1,
                  y: -2,
                },
                actorId: "1483668698770",
              },
            ],
            conditions: [
              {
                enabled: true,
                comparator: "=",
                right: {
                  constant: "180",
                },
                left: {
                  variableId: "transform",
                  actorId: "1483668698770",
                },
                key: "1751940547905",
              },
            ],
            mainActorId: "1483668698770",
          },
          {
            id: "1490495832601",
            name: "If dead, flip back over",
            type: "rule",
            actors: {
              "1483668698770": {
                id: "1483668698770",
                position: {
                  x: 0,
                  y: 0,
                },
                transform: "180",
                appearance: "1483692402546",
                characterId: "aamlcui8uxr",
                variableValues: {},
              },
            },
            extent: {
              xmax: 0,
              xmin: 0,
              ymax: 0,
              ymin: 0,
              ignored: {},
            },
            actions: [
              {
                type: "transform",
                actorId: "1483668698770",
                operation: "set",
                value: {
                  constant: "0",
                },
              },
            ],
            conditions: [
              {
                enabled: true,
                comparator: "=",
                right: {
                  constant: "180",
                },
                left: {
                  variableId: "transform",
                  actorId: "1483668698770",
                },
                key: "1751940547906",
              },
              {
                enabled: false,
                comparator: "=",
                right: {
                  constant: "1483692402546",
                },
                left: {
                  variableId: "appearance",
                  actorId: "1483668698770",
                },
                key: "1751940547907",
              },
            ],
            mainActorId: "1483668698770",
          },
          {
            id: "1483693012624",
            name: "Fall Down\n\n",
            type: "rule",
            actors: {
              "1483668698770": {
                id: "1483668698770",
                position: {
                  x: 0,
                  y: 0,
                },
                appearance: "1483692402546",
                characterId: "aamlcui8uxr",
                variableValues: {},
              },
            },
            extent: {
              xmax: 0,
              xmin: 0,
              ymax: 1,
              ymin: 0,
              ignored: {},
            },
            actions: [
              {
                type: "move",
                delta: {
                  x: 0,
                  y: 1,
                },
                actorId: "1483668698770",
              },
            ],
            conditions: [],
            mainActorId: "1483668698770",
          },
        ],
      },
    ],
    variables: {},
    spritesheet: {
      appearances: {
        "1483692402546": [
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAACaklEQVRYR+2YPU7DMBSAnQ2pR2AvS9cuLDR7tnIAFpQD9AIcgB4g4gqwwZyysFRiYiH3YA56Tp77/HD87CS0ESJCSlMn9pfv/dQiURM/kqnyFXVd50mSjAZYl6qGl01SNcqcAFjtduNMpuEuiiYYn7k+DQHV9pRSGwmwVo0VvaD+sw+0ZuBweCAk2tumaXeIEQ7B4Np8bsNpcMFeC6W/Izb7mBQBKQysB6ZgIWO0DCgtAh0DScPrNajBSIgtpBDAnnlI7bWp5behISlQqpR13fV41RRNkufBVc3tiYAYalMM8IQE2IKZ4jo6oGCMD8cahN4HuUe6h3tFb9XSR5gx12whkK7wiiHGxawQB8Dd7vfqYbk0d54GMMBcTB7y6hVDTEVxg7onFoX5lZG6omSwK7zBIXYBTB5QN/IAi5I9mAcMwplX8CCDpoA8kKFwuHOZr1YK9oA0YsFdHh8qHzcm99LrrfU8HdM9nY27UsVnr7dBAEk/nlS5WP9YE743L7NYi5C/CihVL7yAz6IEN9ggNcVh0fBkAFeXc8O4e6ucciks9j7Y87iqN6pR89UwB6lBCuiio9AAGhLe0UIME0G+SZBwH4JW63v9Hj57owIiJJwl0Jf380Olz2bW9orbj+6DGqRtM65Q0tYDoDS0CE4BsyzzMowOSKF5m8FG/nUG2/LmmBSg1Ddd40c1+A9o+p6nSHw5ODmD2HpCdjVd8L1z0DUh38ngPScBfH3eWoxX2ca6puMw1heyt0EXIEBAr+saO0oOugBgYWppTMhog38CEIze3Rz+O4uG+xRNlEH8LeU5xkPMAXkBxRTMNxpi2xi8o4tjAAAAAElFTkSuQmCC",
        ],
      },
      appearanceNames: {
        "1483692402546": "Standing",
      },
    },
  },
  "1483692598319": {
    id: "1483692598319",
    name: "Lava\n\n",
    rules: [
      {
        id: "1490493030509",
        name: "Hero death ",
        type: "rule",
        actors: {
          "1483668698770": {
            id: "1483668698770",
            position: {
              x: 0,
              y: -1,
            },
            appearance: "1483692402546",
            characterId: "aamlcui8uxr",
            variableValues: {},
          },
          "1483692743355": {
            id: "1483692743355",
            position: {
              x: 0,
              y: 0,
            },
            appearance: "idle",
            characterId: "1483692598319",
            variableValues: {},
          },
        },
        extent: {
          xmax: 0,
          xmin: 0,
          ymax: 0,
          ymin: -1,
          ignored: {},
        },
        actions: [
          {
            type: "move",
            delta: {
              x: 0,
              y: 1,
            },
            actorId: "1483668698770",
          },
          {
            type: "transform",
            actorId: "1483668698770",
            operation: "set",
            value: {
              constant: "180",
            },
          },
        ],
        conditions: [],
        mainActorId: "1483692743355",
      },
      {
        id: "1483692986828",
        name: "Waves 1 => 2",
        type: "rule",
        actors: {
          "1483692730066": {
            id: "1483692730066",
            position: {
              x: 0,
              y: 0,
            },
            appearance: "1483692615578",
            characterId: "1483692598319",
            variableValues: {},
          },
        },
        extent: {
          xmax: 0,
          xmin: 0,
          ymax: 0,
          ymin: 0,
          ignored: {},
        },
        actions: [
          {
            type: "appearance",
            actorId: "1483692730066",
            value: {
              constant: "idle",
            },
          },
        ],
        conditions: [
          {
            enabled: true,
            comparator: "=",
            right: {
              constant: "1483692615578",
            },
            left: {
              variableId: "appearance",
              actorId: "1483692730066",
            },
            key: "1751940547908",
          },
        ],
        mainActorId: "1483692730066",
      },
      {
        id: "1483692974417",
        name: "Waves 2 => 1",
        type: "rule",
        actors: {
          "1483692743355": {
            id: "1483692743355",
            position: {
              x: 0,
              y: 0,
            },
            appearance: "idle",
            characterId: "1483692598319",
            variableValues: {},
          },
        },
        extent: {
          xmax: 0,
          xmin: 0,
          ymax: 0,
          ymin: 0,
          ignored: {},
        },
        actions: [
          {
            type: "appearance",
            actorId: "1483692743355",
            value: {
              constant: "1483692615578",
            },
          },
        ],
        conditions: [
          {
            enabled: true,
            comparator: "=",
            right: {
              constant: "idle",
            },
            left: {
              variableId: "appearance",
              actorId: "1483692743355",
            },
            key: "1751940547909",
          },
        ],
        mainActorId: "1483692743355",
      },
    ],
    variables: {},
    spritesheet: {
      appearances: {
        idle: [
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAABfklEQVRYR+2XsXXDIBCGjxmyg3dIZ+3g3uk0gAbw8wAagC7pXbpHc3iHzEDeIYERYECCWCqOyjrdf/fdL8STGexgSQGSNcBCKF4QkzHxlaD2PKl+Qeo1ELrRkuFScKrWGphamtij1T02BcwZ1AMUXaf2YGw1fe/rbmmdXbM5+TWCL4nkXAENH48o1PHUw3DrTI7dQAJIvIc50SUAhvtU43Oe6QKLaWCGgKxtGTZJOefeZwBGd/3y1ZdvK8Y5QNuqwNA9BzUZDjDGj78HUIBa6LUQVuTBx4upCf60oS7nufr6M16reLN09ClfoAN47ukCOOWrdRinx8YzZ+whAloNmovo1h4B3aXdwrgFZhyx8113EsApUHegMGCqyhvvE2Cp2eQgOagdUOefcxiXupOjpz2Y41IshxwkB0sdKNVvugdzjq5VgDmFS53T+lWAsea14asD1nLu3xwkQPPHaIMPg5D7tAdL9yQ5+HYHSw/ipfpdPeIQ/K4A6ZgpfSFC+j8LJLz4CwieagAAAABJRU5ErkJggg==",
        ],
        "1483692615578": [
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAABbElEQVRYR+2WwZHCMAxF5Rq4pQHaID1w55gCKGBnC0gBOXLfHsiJHqCA3KjBO3LijDGbSJbBITvOjUT6//lb9qDgwx+Vmk+fQaOnKoHlzSqaWoTuGmNmDIuKpYWAXDij65ujKdssoNb6fDwgNVJ2BOwYPCTopifZPspc8v0JcBQpqlk95YyHBtDub2zEdxIgtwc1DeCY1gDV/hxntct9raYAqN5QaGX2vBzaugbayy1U46F+t6mhvfcL3O1rUssuaKztGtNjOXpAfDGIGuENLez3uCSz/dsewH/+CgZ1RkByqQsVZMDY4HOCb0vw+wTwdQiUxxN6nb/gAxXzKQ4N7Klefki87ZSMBKdHDhidDU8gA/Jymq5ad4KcIY5NiOpfPkHicl8ekIhwxYAT0aeeyxUnSB0v//sb/smgRdIEJeORFDB0U5InmAElCcT2sGZQMtyxYLafBfgqM1+Hs/BFATkLfx3gf7ioOYn5Nb+SC8fGgab5wwAAAABJRU5ErkJggg==",
        ],
        "1483692635012": [
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAAyUlEQVRYR+2V2xFAMBBFNzUoQhu6UYA6FKAa2lCEGmLM8MNE7srLTtb3lTl7bhZjZ7L048eIA1y2gbpmhJ1y8/DBZ1CeQe6EqfNqMNRwMYPoctUDiBrhVl7MIAqqgKgpV04NRjeYahu9oO1EtPaPmFbsNecJxDHoqCcU7ng/DmAMEscZChgqVw2KNYj+EN4rTvj5QM3mu4Mfh80HiCq75eQBopf3GpSb54qUZ5A7Yeq8Ggw1XMwgulz1AKJGuJUXM4iCKiBqypXbAfUKmbFp3UOVAAAAAElFTkSuQmCC",
        ],
        "1490494385810": [
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAABmUlEQVRYR+3WMVLDQAwFUOUe3CVDn5KOghRwAg4AOUBOQIpQ0KVwEWomPdehYyYZTSJb1mh3Ja9jb2bsKsVavP0rrZm9L+EIBT+z488Z+P23bzF/d4t+2FtWZukvGQRiqaqq6op3/xtf9S3AfPfaeuewX/tqAEAUKJFU3Y11s5oXksAQsiv27an546vPtLwGyqW8J/lRx0qmkm3h7gGAejLSp0Egh7x8PUe3+vG4AVqDvy3J8ILzxblXDw/rBn1ZYAJSMQlFTOyxQmugMkQuIGJ4UukO8vWbVs8N9KDkWtxcqk/lO4MDERBC0hDx1hgUyFtEg9ZANuGDA2NIBK4Qh8/lChoFmEqS92ERwFhfFgMMIUcDymOmY5UTbgbi6PNvac59GPoyaSmagX2AtBrad56nOAEtycdSHD3B1LAUAdSQ1IfFAmmiRwXyqyvUh52AQ96JnYCpf/O7XugyRezD3oGWayW05uaAuJGiEtSuGxV4jSGwHr085ttM0Lrba6ybEsxNNTvB3AGyvk/QooZEwxcF1NpjAuYOzQnNcQXoUhrdTgAAAABJRU5ErkJggg==",
        ],
      },
      appearanceNames: {
        idle: "Surface1",
        "1483692615578": "Surface2",
        "1483692635012": "Deep",
        "1490494385810": "Untitled",
      },
    },
  },
  "1483692683990": {
    id: "1483692683990",
    name: "Dirt\n\n",
    rules: [],
    variables: {},
    spritesheet: {
      appearances: {
        idle: [
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAABRklEQVRYR+2YMQ7CMAxFW4mdC3AXVgZuwMLADXoBLsANWNkYGdgQd+EC7EhFv5JRFNI4dsC0KJlt5+Xbid3W23XVzpdNJV3X0+7NRRMntK8bu74cm5aMQpv2gffBSGJwsRGrA/xEUGkGUu1fCg4VsqYaHCwg1eC3AVGzmj3MahCAh/O9mj32qeXX2Q0aEIcyB4QqUJGeqVjaO0BcEpHmSmMCQpqxVospW5OmgHSuFOVcWzMFNcL/REEJKAt4m2yC8aRPhQTKtY3eYsD5IC6wBWQvYAhOq0Kun9k7qAUdP2BsStY0f6mSrIKhKYQuS0o3kAL59ixgbAOLy5QFmKtOin8BTFEpZlMU/GsF2Wkm9/S5/gVwFAqi26Al0qL+Te0yNleafnb6oADmhg1TQG26y0OtVY78ioLZClr9m9GAlk6iUc3/s/AEZv3637C3f9UAAAAASUVORK5CYII=",
        ],
        "1483692702012": [
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAABUUlEQVRYR+2Yyw3CMAyG28lYgCHYoQuwAJtw5I6YrChIrlzHj6S1aleix2KHL78dO/U47Hjut2G+XCdxhc/rMWi/S47FD56xh+/9nGawx4twawCYZUd96YaaALFSvX/YIwAHawL2qLYHRoqCCghwR6qGQUu4TcAouAKqAkar1wQYqZ4KmEE9EzBaPVdArlt4bJA9JF7hpdBbgEXALYt5F2kxxEXBtIDQc9MCeuWfV7irHMwU3ioHs4X3fIDZ8q9SMDL/tM+D330wUj3ccbjytgBmqX20RKUGXOpgZP5pRd0N0OPmon7VeStoJX5rK1wpWJyyHZQFMGObWxXqP2Br0hG78+Sg9yneKFjl5lYHvYDE8VvU/M/a2OrKT8e5WWoiO37jZs8RwOZ8sISAU9arlXWF2DLGF1toi9aEH9bsnd1ge3NG3QJObfBcm+vxUgS491/yDgvM4svSEgAAAABJRU5ErkJggg==",
        ],
        "1490493383297": [
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAACe0lEQVRYR82XPVLDMBCFlRk6Ci7AXRg6Chcp6GgofINcIBfgBilo6ChSuKDLcBcuQEfBjJkX/Mxmo5VWju3gKti72k9vfyQW68fQ3lSrUPq8N09HLp516JeylWsvdq+rlpFe3j7dnA93V1Fbvcb19+bA7uOi3v+t31uB94ByUa+jeychBELFfHLxegUBmdttKlAJsMcWGUKqF6xBmXeASNg5wQjfAyLFhJsShAG9MVjjRzXokX+ITSkgYsDnbICeEuoBQVsyYk5VkHCYham4e8C6rlv8mAuQm8vB9SmeC1B2pzdjsyo4tCxmS/EQQPiMBhg7srwzLwW/Bxy6O+mnLw9jDf9iQOu8ti4CUsXlchm22+2RKd9vNptQ17+3HT4HgAieSwtsMCJu7//ug03T9AvGAPgRIHguv3b9WOO7qqp6pgNAvZ2maVorCNVbP4cAqKqqFtI/5Qs7KAQ/ub5UDz2heY5ewCAWCIuvH0Ow4Cw/GZCAeEfIUQGZSq0cIbAxGVyrAcBuI9MBWnASMlWHOs2qBk9LcazuSmqYdag7FZBdk5wXMNYkhO42+j8Apeooh642ow1rdrEudu7eU4NWo+g12FRWerFOElAGmgKwUxKdH+VIAkJ6dhjT4G2SlIIpGN1wWUAY5Aap1cWxczdVazG4bIpFAdPfTIWeg5MCxo6tblYVAeoatkaJpZ6p4BiAsjw46zw1rGFNRfSFoVRBXb+5c7yoBsdUkPc8HG/eTUrYyRUEIM/eyQBLFtZXLnmNH23MMMVS6twRJ22tm/WogHKu4XcJYKyG2TSl62TnWmpG5b5JJYeol5yDueCe7wC0/lvz+E8O6IVI2f0AyXNcWTkgWVYAAAAASUVORK5CYII=",
        ],
        "1490493932180": [
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAB30lEQVRYR+1YMU7EMBBcS3wCieL+AH0u/f0BCiQeEBqoQhOqewAIiYoOOgq6kAfQ8YAUSFcjWqRDNmxkO469tpMQUNLkLreemZ3dOJtjWVls4ed4qc7xozg/w0Kct7tnkG5Omt/KBCCtlFDYTwpxQcbA9QIjqeEUvmP0OOTiPGxz2cQsoQa2zKERqFLGf+MCOYl8mK7ZmFoC5aypEnURuM6GRVnTOCgD5bWasU3k6vYKDi7UksitYcL6OCxgXV0LWFkkasA1ySqD9PUBGOQLUWIfYSiak8kHEruwcB3GI4ZpHSvvMyGwelwrZDwD/Rq15Ka4UDwhsE8hXUlQBL7tHMPe540CQRbYRUAh5ozUOD1BssCY8naV3NRacixPiuVHw+2DtnLfPb23yqnHOwWaeiLWSU7qcg45nAJtYkw9ZUootPewb40lDgXtw3EZI8rB2FJT1guBY+2DFEHGm2RIga5WcbXE5B3kjnaW2JWdXA6fWN9ST7oHrQ76ZjpU/OxgrLP/w0F8wOtujDHoOh20DarUqSSmzFaBrieBL3EIntNBXxG+I5orfrSJ2mdQ7WVg7dNZ26vBaA6GJDQPrCGutV47hxxYYwXO08zsYB8OxGJMeh8UN8lv/HlEdfVPbNRf9P05ULZWUXsAAAAASUVORK5CYII=",
        ],
        "1490494131125": [
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAABZ0lEQVRYR+2ZQRKDIAxF4X4sPATH8hAuuF87sY2DCkw+RE1n2k079hseIQkRvXPOpZRe9I18Qgj+qO+xUxozt+1zo8uyiBmnaSpqERslA7ldAl0BR42KZwUI53km9QeQflmD3AA5Bs0CGvegMxuDtLK0zN2AdHNKqRm7Ek0rb1bAGCNcA9koGYgxArmJSYcBseFw9R8Q99n+jpMHaZuxUg+/hXqfJHzxysCXenXbSUayWDpYj+5XAMfqYI9nkHtuLzOUhCEEcXG/HRDdeSBAdPbIUta0ECA6+9sBNQZEbUAeRI2j+lIIqQGO9n219k0NkLtf7S2y2CwgdQpdRlR/AnwiUy9t+VGPoHrVGEQHl+jNANZCywRgaws1AfhYkmg831zqQY3nGwhQwyOSzM01YkDOsicK+dDZDOoRVC/2IGpYSz8MyIlAQMdOJv+PgWvdTk1bbBY6Zk+vI2pHeMdXFa2jvlzLOv8GiSMRRD2TZQ4AAAAASUVORK5CYII=",
        ],
      },
      appearanceNames: {
        idle: "Idle",
        "1483692702012": "Corner\n\n",
        "1490493383297": "Cave 1",
        "1490493932180": "Grassy",
        "1490494131125": "Untitled",
      },
    },
  },
};

export default InitialCharacters;
